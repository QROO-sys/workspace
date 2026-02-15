import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
// Mock JWT, db, etc.

describe('MenuCategoryController (e2e)', () => {
  let app: INestApplication;
  let jwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    // Create a mock OWNER user, get their JWT
    // (or use a seeded token)
    jwt = 'Bearer faketokenvalue'; // Replace with real mock logic
  });

  afterAll(async () => {
    await app.close();
  });

  it('/menu-categories (POST) creates category', async () => {
    return request(app.getHttpServer())
      .post('/menu-categories')
      .set('Authorization', jwt)
      .send({ name: 'Drinks' })
      .expect(201)
      .expect(res => {
        expect(res.body.name).toBe('Drinks');
      });
  });

  it('/menu-categories (GET) lists categories', async () => {
    return request(app.getHttpServer())
      .get('/menu-categories')
      .set('Authorization', jwt)
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});