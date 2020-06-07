import request from 'supertest';
import app from '../src/app';

describe('GET /api', () => {
    it('returns 200 OK', (done) => {
        return request(app).get('/api')
            .expect(200)
            .end(function(err, res) {
                const body = res.body;
                expect(Object.keys(body)).toContain('version');
                expect(body.version).toEqual('1.0.0');
                done();
            });
    });
});
