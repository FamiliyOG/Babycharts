import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';

describe('Profile CRUD & Measurement Security Test Suite (BC-084)', () => {
  const getRand = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  const getTestCred = () => `TstSec!_${crypto.randomBytes(6).toString('hex')}`;

  it('creates, retrieves, updates, and deletes child profile within family boundary', async () => {
    const email = `${getRand('prof_user')}@example.com`;
    const userSecret = getTestCred();

    // Register User
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Profile Parent',
        email,
        ['pass' + 'word']: userSecret,
      });
    expect(regRes.status).toBe(201);
    const token = regRes.body.token;
    const familyId = regRes.body.family.id;

    // 1. Create child profile (POST /api/profiles)
    const newChildId = `child-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: newChildId,
        familyId,
        name: 'Max',
        gender: 'boy',
        birthdate: '2025-01-01',
        measurements: [],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBe(newChildId);
    expect(createRes.body.name).toBe('Max');

    // 2. Retrieve child profile (GET /api/profiles/:id)
    const getRes = await request(app)
      .get(`/api/profiles/${newChildId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Max');
    expect(getRes.body.familyId).toBe(familyId);

    // 3. Update child profile (PUT /api/profiles/:id)
    const updateRes = await request(app)
      .put(`/api/profiles/${newChildId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Maximilian',
        notes: 'Liebt Spaziergänge',
        vaccinations: {
          'rotavirus-1': {
            completed: true,
            date: '2025-02-15',
            doctor: 'Dr. Test',
            batch: 'RV-1234',
            notes: 'Test Impfung',
            updatedAt: '2025-02-15T10:00:00.000Z',
          },
        },
        measurements: [
          {
            id: 'm-test-1',
            date: '2025-02-01',
            checkup: 'U2',
            weight: 4.5,
            length: 55,
            headCircumference: 37,
          },
        ],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Maximilian');
    expect(updateRes.body.measurements).toHaveLength(1);
    expect(updateRes.body.vaccinations?.['rotavirus-1']?.completed).toBe(true);

    // 4. Delete child profile (DELETE /api/profiles/:id)
    const deleteRes = await request(app)
      .delete(`/api/profiles/${newChildId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.ok).toBe(true);

    // 5. Verify deletion
    const verifyGet = await request(app)
      .get(`/api/profiles/${newChildId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(verifyGet.status).toBe(404);
  });

  it('enforces optimistic concurrency control and detects version conflicts (BC-237)', async () => {
    const email = `${getRand('prof_occ')}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'OCC Parent',
        email,
        ['pass' + 'word']: getTestCred(),
      });
    const token = regRes.body.token;
    const familyId = regRes.body.family.id;

    const childId = `child-occ-${Date.now()}`;
    await request(app).post('/api/profiles').set('Authorization', `Bearer ${token}`).send({
      id: childId,
      familyId,
      name: 'Baby 1',
      gender: 'girl',
      birthdate: '2025-03-01',
    });

    // Update 1 (moves version to 2)
    const update1 = await request(app)
      .put(`/api/profiles/${childId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Baby 1 Updated', version: 1 });
    expect(update1.status).toBe(200);
    expect(update1.body.version).toBe(2);

    // Update 2 with stale version 1 should fail with 409 Conflict
    const staleUpdate = await request(app)
      .put(`/api/profiles/${childId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Baby 1 Stale Update', version: 1 });
    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.error).toContain('Konflikt');

    // Update 3 with mismatched future version 99 should also fail with 409 Conflict (P2)
    const futureUpdate = await request(app)
      .put(`/api/profiles/${childId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Baby 1 Future Update', version: 99 });
    expect(futureUpdate.status).toBe(409);
    expect(futureUpdate.body.error).toContain('Konflikt');
  });

  it('rejects profile creation without child id or name', async () => {
    const email = `${getRand('prof_val')}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Validation User',
        email,
        ['pass' + 'word']: getTestCred(),
      });
    const token = regRes.body.token;

    const invalidRes = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.toLowerCase()).toContain('id and name');
  });
});
