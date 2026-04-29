import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('TrackablesController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        organizationName: 'Test Org',
      });
    accessToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/trackables - should create trackable', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/trackables')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test Trackable', type: 'project' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Trackable');
    expect(res.body.status).toBe('created');
  });

  it('GET /api/trackables - should list trackables', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/trackables')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /api/trackables/list - should return cursor listing shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/trackables/list')
      .query({ scope: 'active', limit: 10 })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.totalCount).toBe('number');
    expect(res.body.facets).toMatchObject({
      total: expect.any(Number),
      overdue: expect.any(Number),
      dueToday: expect.any(Number),
      dueWeek: expect.any(Number),
      dueMonth: expect.any(Number),
      normal: expect.any(Number),
      noDeadline: expect.any(Number),
    });
    expect(res.body.nextCursor === null || typeof res.body.nextCursor === 'string').toBe(true);
  });
});
