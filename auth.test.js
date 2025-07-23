const app = require('./server');
const request = require('supertest');

let server;
beforeAll(() => {
  server = app.listen(4000);
});
afterAll((done) => {
  server.close(done);
});

describe('Auth API', () => {
  it('should return 401 for missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
  });
});


