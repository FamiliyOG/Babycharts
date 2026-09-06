import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';

describe('API Versioning & Legacy Deprecation Suite (Issue #292)', () => {
  it('serves /api/v1/health without deprecation headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('v1');
    expect(res.headers['deprecation']).toBeUndefined();
  });

  it('serves /api/health with RFC 9263 Deprecation, Sunset, and Link successor headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['deprecation']).toBe('true');
    expect(res.headers['sunset']).toBeDefined();
    expect(res.headers['link']).toContain('rel="successor-version"');
    expect(res.headers['link']).toContain('/api/v1/health');
  });

  it('supports exports trigger via /api/v1/exports/trigger/:childId', async () => {
    const res = await request(app).post('/api/v1/exports/trigger/non-existent-child');
    // Without token, it should reject with 401 Unauthorized
    expect(res.status).toBe(401);
  });
});
