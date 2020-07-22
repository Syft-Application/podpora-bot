import nock from 'nock';
import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { build_service, build_response, fixture } from '../helpers';
import { store } from '../../src/util/secrets';
import app from '../../src/app';

const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);
jest.spyOn(logger, 'info').mockReturnValue({} as Logger);

const storeGetSpy = jest.spyOn(store, 'get').mockReturnValue(true);

beforeAll(() => {
    return nock.enableNetConnect(/localhost|127\.0\.0\.1/);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/jira/event/:team_id', () => {
    const api_path = '/api/jira/event/T0001';
    const service = build_service(app, api_path);
    const params = {};
    const response = build_response(service(params));
    storeGetSpy.mockImplementation((key, callback) => {
        callback(null, 'team_id,some_channel_id,some_thread_ts');

        return true;
    });

    it('returns 200 OK', () => {
        return service(params).expect(200);
    });

    it('returns empty', (done) => {
        response((body: Record<string, unknown>) => {
            expect(body).toEqual({});
            done();
        }, done);
    });

    describe('slack team not found', () => {
        const api_path = '/api/jira/event/BAD-TEAM-ID';
        const service = build_service(app, api_path);
        const params = {};

        it('logs the event', (done) => {
            expect.assertions(2);

            service(params).expect(200).end((err) => {
                if (err) {
                    return done(err);
                }
                expect(logErrorSpy).toHaveBeenCalled();
                const log_args = JSON.stringify(logErrorSpy.mock.calls[0]);
                expect(log_args).toContain('postEvent');
                done();
            });
        });
    });

    // describe(')

    describe('slack thread not found', () => {
        const params = fixture('jira/webhook.issue_updated_status_change');

        it('logs the event', (done) => {
            expect.assertions(2);
            storeGetSpy.mockImplementationOnce((key, callback) => {
                callback(null, null);

                return true;
            });

            service(params).expect(200).end((err) => {
                if (err) {
                    return done(err);
                }
                expect(logErrorSpy).toHaveBeenCalled();
                const log_args = JSON.stringify(logErrorSpy.mock.calls[0]);
                expect(log_args).toContain('Slack thread not found for issue');
                done();
            });
        });
    });

    describe('store returns an error', () => {
        const params = fixture('jira/webhook.issue_updated_status_change');

        it('logs the event', (done) => {
            expect.assertions(2);
            const err = new Error('Some store error');
            storeGetSpy.mockImplementationOnce((key, callback) => {
                callback(err, null);

                return true;
            });

            service(params).expect(200).end((err) => {
                if (err) {
                    return done(err);
                }
                expect(logErrorSpy).toHaveBeenCalled();
                const log_args = JSON.stringify(logErrorSpy.mock.calls[0]);
                expect(log_args).toContain('Some store error');
                done();
            });
        });
    });

    describe('webhookEvent: jira:issue_updated', () => {
        describe('status change', () => {
            const params = fixture('jira/webhook.issue_updated_status_change');

            it('sends message to Slack thread about status change', (done) => {
                let api_call_body: string;
                expect.assertions(4);

                nock('https://slack.com')
                    .post('/api/chat.postMessage', (body) => {
                        api_call_body = JSON.stringify(body);
                        return body;
                    })
                    .reply(200, { ok: true });

                service(params).expect(200).end((err) => {
                    if (err) {
                        return done(err);
                    }

                    expect(storeGetSpy).toHaveBeenCalled();
                    expect(api_call_body).toContain('some_channel_id');
                    expect(api_call_body).toContain('some_thread_ts');
                    expect(api_call_body).toContain('status changed');
                    done();
                });
            });
        });

        describe('file attachment added', () => {
            const params = fixture('jira/webhook.issue_file_attached');

            it('returns 200 OK and sends message to Slack thread', (done) => {
                let api_call_body: string;
                expect.assertions(2);

                nock('https://slack.com')
                    .post('/api/chat.postMessage', (body) => {
                        api_call_body = JSON.stringify(body);
                        return body;
                    })
                    .reply(200, { ok: true });

                service(params).expect(200).end((err) => {
                    if (err) {
                        return done(err);
                    }

                    expect(storeGetSpy).toHaveBeenCalled();
                    expect(api_call_body).toContain('has been attached to');
                    done();
                });
            });
        });
    });
});
