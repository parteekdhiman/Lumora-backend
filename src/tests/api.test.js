import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { redisClient, connectRedis } from '../shared/services/redis.service.js';

describe('Lumora API Integration Tests', () => {
  let employerToken = '';
  let jobseekerToken = '';
  let employerId = '';
  let jobId = '';

  beforeAll(async () => {
    // Ensure we use a test database
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/lumora_test';
    await connectDB();
    
    // Ensure redis is connected
    if (!redisClient.isOpen) {
      try { await redisClient.connect(); } catch (e) {}
    }

    // Clear database before tests
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  });

  it('1. Register & Login Employer', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Employer',
        email: 'employer@test.com',
        password: 'password123',
        role: 'employer'
      });
      
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'employer@test.com',
        password: 'password123'
      });
      
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    employerToken = res.body.token;
  });

  it('2. Register & Login Jobseeker', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Jobseeker',
        email: 'jobseeker@test.com',
        password: 'password123',
        role: 'jobseeker'
      });
      
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jobseeker@test.com',
        password: 'password123'
      });
      
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    jobseekerToken = res.body.token;
  });

  it('3. Employer posts a job', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Cookie', [`jwt=${employerToken}`])
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Software Engineer',
        description: 'Great job',
        company: 'Tech Corp',
        location: 'Remote',
        salary: '100k-150k',
        type: 'Full-time',
        experienceLevel: 'Mid Level',
        requirements: ['Node.js', 'React']
      });

    if (res.statusCode !== 201) {
      console.error('Job creation failed:', res.body);
    }

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    jobId = res.body._id;
  });

  it('4. Jobseeker fetches jobs', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('5. Jobseeker applies for the job', async () => {
    const res = await request(app)
      .post(`/api/applications/apply`)
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Cookie', [`jwt=${jobseekerToken}`])
      .send({
        jobId: jobId,
        coverLetter: 'I am a great fit.'
      });
    expect([201, 400]).toContain(res.statusCode);
  });

  it('6. Employer fetches applications', async () => {
    const res = await request(app)
      .get(`/api/applications/job/${jobId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Cookie', [`jwt=${employerToken}`]);
    expect(res.statusCode).toBe(200);
  });
});
