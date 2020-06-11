import request from 'supertest';

jest.mock('@slack/web-api');

import app from '../src/app';

describe('GET /random-url', () => {
    it('return 404', (done) => {
        request(app).get('/random-url')
            .expect(404, done);
    });
});
