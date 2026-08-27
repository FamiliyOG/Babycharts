import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';

describe('Server API Endpoints (Supertest)', () => {
  it('GET /api/profiles unauthenticated with familyId returns 401', async () => {
    const res = await request(app).get('/api/profiles?familyId=fam-invalid');
    expect(res.status).toBe(401);
    expect(res.body?.error).toContain('Nicht autorisiert');
  });

  it('GET /api/exports without auth token returns 401', async () => {
    const res = await request(app).get('/api/exports');
    expect(res.status).toBe(401);
    expect(res.body?.error).toContain('Nicht autorisiert');
  });

  it('POST /api/profiles without auth token returns 401', async () => {
    const res = await request(app).post('/api/profiles').send({ id: 'test-1', name: 'Test' });
    expect(res.status).toBe(401);
  });
});
