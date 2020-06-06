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

interface ServiceResponseCallback {
    (body: Record<string, unknown>): void;
}

describe('POST /api/slack/command', () => {
    const api_path = '/api/slack/command';
    const api_service = () => { return request(app).post(api_path); };

    describe('when no command param present', () => {
        it('returns 200 OK', () => {
            return api_service().expect(200);
        });

        describe('response.body', () => {
            const response = (callback: ServiceResponseCallback, done: jest.DoneCallback) => {
                return api_service().end((err, res) => {
                    if (err) {
                        done(err);
                    }
                    return callback(res.body);
                });
            };

            it('contains error message', (done) => {
                response((body: Record<string, unknown>) => {
                    expect(body).toEqual({
                        text: 'Unknown or missing command'
                    });

                    done();
                }, done);
            });
        });
    });

    it('returns 200 OK', (done) => {
        return api_service()
            .expect(200, done);
    });
});

describe('POST /api/slack/event', () => {
    const api_path = '/api/slack/event';
    it('returns 200 OK', (done) => {
        return request(app).post(api_path)
            .expect(200, done);
    });
});
