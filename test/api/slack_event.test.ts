import nock from 'nock';
import { Logger } from 'winston';
import { build_service, build_response, fixture } from '../helpers';
import logger from '../../src/util/logger';
import redis_client from '../../src/util/redis_client';

import app from '../../src/app';

const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);
const logInfoSpy = jest.spyOn(logger, 'info').mockReturnValue({} as Logger);
const redis_client_double = {
    mset: jest.fn(),
    get: jest.fn()
};

jest.mock('../../src/util/redis_client');

(redis_client as jest.Mock).mockImplementation(() => {
    return redis_client_double;
});

beforeAll(() => {
    return nock.enableNetConnect(/localhost|127\.0\.0\.1/);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/slack/event', () => {
    const api_path = '/api/slack/event';
    const service = build_service(app, api_path);
    const createIssueResponse = fixture('jira/issues.createIssue.response');
    const issue_key = createIssueResponse.key as string;

    describe('type: url_verification', () => {
        const params = {
            type: 'url_verification',
            token: 'dummy token',
            challenge: 'dummy challenge'
        };
        const response = build_response(service(params));

        it('responds back with the challenge param', (done) => {
            response((body: Record<string, unknown>) => {
                expect(body.challenge).toEqual('dummy challenge');
                done();
            }, done);
        });

        it('logs the event without token', (done) => {
            expect.assertions(3);
            service(params).expect(200).end((err) => {
                if (err) {
                    return done(err);
                }
                expect(logInfoSpy).toHaveBeenCalled();
                const log_args = JSON.stringify(logInfoSpy.mock.calls[0]);
                expect(log_args).toContain('postEvent');
                expect(log_args).not.toContain(params.token);
                done();
            });
        });
    });

    describe('messages with files', () => {
        const params = fixture('slack/events.message_with_file') as Record<string, unknown>;

        it('adds link to the file to jira issue', (done) => {
            nock('https://example.com')
                .post(`/rest/api/2/issue/${issue_key}/comment`)
                .reply(200);

            redis_client_double.get.mockImplementationOnce((key, callback) => {
                return callback(null, issue_key);
            });

            return service(params).expect(200, done);
        });

        describe('when redis throws an error', () => {
            it('logs the error', (done) => {
                const key_error: Error = new Error('Some redis error');
                redis_client_double.get.mockImplementationOnce((key, callback) => {
                    return callback(key_error);
                });

                service(params).expect(200).end((err) => {
                    if (err) {
                        return done(err);
                    }

                    expect(logErrorSpy).toHaveBeenCalled();
                    expect(logErrorSpy.mock.calls[0].toString())
                        .toContain(key_error.message);
                    done();
                });
            });
        });

        describe('when key is not in db', () => {
            it('logs the error', (done) => {
                redis_client_double.get.mockImplementationOnce((key, callback) => {
                    return callback(null, null);
                });

                service(params).expect(200).end((err) => {
                    if (err) {
                        return done(err);
                    }

                    expect(logErrorSpy).toHaveBeenCalled();
                    expect(logErrorSpy.mock.calls[0].toString())
                        .toContain('Issue key not found');
                    done();
                });
            });
        });
    });
});
