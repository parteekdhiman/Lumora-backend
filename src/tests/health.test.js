import request from 'supertest';
import app from '../app.js';

describe('Health Check API', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.statusCode).toEqual(404);
  });
});
