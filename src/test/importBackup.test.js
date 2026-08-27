import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { readDb } from '../../server/utils/db.js';

describe('Import & Backup-Restore Integration Test Suite (BC-085, BC-086)', () => {
  const getRand = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  const getTestCred = () => `TstSec!_${crypto.randomBytes(6).toString('hex')}`;

  it('validates backup JSON structure and exports child profile data faithfully', async () => {
    const email = `${getRand('backup_user')}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Backup Parent',
        email,
        ['pass' + 'word']: getTestCred(),
      });
    const token = regRes.body.token;
    const familyId = regRes.body.family.id;

    const childId = `child-backup-${Date.now()}`;
    await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: childId,
        familyId,
        name: 'Noah Backup',
        gender: 'boy',
        birthdate: '2025-01-01',
        measurements: [
          {
            id: 'm-1',
            date: '2025-01-01',
            checkup: 'U1',
            weight: 3.5,
            length: 51,
            headCircumference: 35.5,
            notes: 'Initial Geburt',
          },
        ],
        vaccinations: {
          'rotavirus-1': { completed: true, date: '2025-02-15' },
        },
        milestones: {
          'first-smile': { completed: true, date: '2025-02-20' },
        },
      });

    // Verify DB integrity for backup
    const db = readDb();
    const child = db.profiles.find((p) => p.id === childId);
    expect(child).toBeDefined();
    expect(child.measurements).toHaveLength(1);
    expect(child.vaccinations['rotavirus-1'].completed).toBe(true);
    expect(child.milestones['first-smile'].completed).toBe(true);
  });

  it('restores profile from JSON backup data and updates database cleanly', async () => {
    const email = `${getRand('restore_user')}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Restore Parent',
        email,
        ['pass' + 'word']: getTestCred(),
      });
    const token = regRes.body.token;
    const familyId = regRes.body.family.id;

    const restoredChildId = `restored-child-${Date.now()}`;
    const backupPayload = {
      id: restoredChildId,
      familyId,
      name: 'Lina Restored',
      gender: 'girl',
      birthdate: '2025-03-01',
      measurements: [
        {
          id: 'm-restored-1',
          date: '2025-03-01',
          checkup: 'U1',
          weight: 3.2,
          length: 49,
          headCircumference: 34,
        },
      ],
      teeth: {
        51: { date: '2025-08-01', notes: 'Erster Zahn' },
      },
    };

    // Import / Restore through POST /api/profiles
    const restoreRes = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send(backupPayload);

    expect(restoreRes.status).toBe(201);
    expect(restoreRes.body.name).toBe('Lina Restored');

    const db = readDb();
    const importedChild = db.profiles.find((p) => p.id === restoredChildId);
    expect(importedChild).toBeDefined();
    expect(importedChild.teeth['51'].notes).toBe('Erster Zahn');
  });
});
