import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MikroORM } from '@mikro-orm/core';
import { AppModule } from '../src/app.module';
import { seedLegalProcessTemplates } from '../../../packages/db/src/seeds/legal-process-templates.seed';

describe('Legal process (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const orm = moduleFixture.get(MikroORM);
    const em = orm.em.fork();
    await seedLegalProcessTemplates(em);

    const email = `legal-e2e-${Date.now()}@example.com`;
    const res = await request(app.getHttpServer()).post('/api/auth/register').send({
      email,
      password: 'password123',
      organizationName: 'Legal E2E Org',
    });
    expect(res.status).toBe(201);
    accessToken = res.body.accessToken;
    expect(res.body.user?.organizationId).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  it('initialize civil ordinario + timeline 10 etapas + plazo traslado', async () => {
    const tRes = await request(app.getHttpServer())
      .post('/api/trackables')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Legal E2E Matter', type: 'litigation' });
    expect(tRes.status).toBe(201);
    const trackableId = tRes.body.id as string;

    const tplRes = await request(app.getHttpServer())
      .get('/api/legal/process/templates')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(tplRes.status).toBe(200);
    const templates = tplRes.body as Array<{ id: string; slug: string }>;
    const civil = templates.find((t) => t.slug === 'civil-ordinario-cpc-pe');
    expect(civil).toBeTruthy();

    const initRes = await request(app.getHttpServer())
      .post('/api/legal/process/initialize')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        trackableId,
        workflowDefinitionId: civil!.id,
      });
    expect([200, 201]).toContain(initRes.status);

    const tlRes = await request(app.getHttpServer())
      .get(`/api/legal/process/trackables/${trackableId}/timeline`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(tlRes.status).toBe(200);
    expect(tlRes.body.hasProcess).toBe(true);
    expect(tlRes.body.stages).toHaveLength(10);

    const traslado = tlRes.body.stages.find((s: { key: string }) => s.key === 'civil_ord_03_traslado');
    expect(traslado).toBeTruthy();

    const notifDate = '2025-06-02';
    const dlRes = await request(app.getHttpServer())
      .post('/api/legal/process/deadlines/register-notification')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        trackableId,
        workflowStateId: traslado.id,
        notificationDate: notifDate,
      });
    expect([200, 201]).toContain(dlRes.status);
    expect(dlRes.body.dueDate).toBeDefined();
    expect(dlRes.body.legalDays).toBe(30);
  });
});
