const request = require('supertest');
const express = require('express');
const app = require('../server'); // jeśli Twój server.js eksportuje app

describe('API tests', () => {
  it('GET /health should return 200 and status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET /tasks should return array', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /tasks should create new task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test task', description: 'Test description' });
    expect(res.statusCode).toEqual(201);
    expect(res.body.title).toBe('Test task');
  });

  it('PUT /tasks/:id should update task', async () => {
    const tasks = await request(app).get('/tasks');
    if (tasks.body.length === 0) return;

    const taskId = tasks.body[0].id;
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ completed: true });
    expect(res.statusCode).toEqual(200);
    expect(res.body.completed).toBe(true);
  });

  it('DELETE /tasks/:id should remove task', async () => {
    const tasks = await request(app).get('/tasks');
    if (tasks.body.length === 0) return;

    const taskId = tasks.body[0].id;
    const res = await request(app).delete(`/tasks/${taskId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Task deleted');
  });
});
