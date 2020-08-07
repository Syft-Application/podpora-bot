import nock from 'nock';
import { Logger } from 'winston';
import { build_service, build_response, fixture } from '../../helpers';
import logger from '../../../src/util/logger';
import { store } from '../../../src/util/secrets';
import app from '../../../src/app';

const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);
const storeGetSpy = jest.spyOn(store, 'get');

beforeAll(() => {
    return nock.enableNetConnect(/localhost|127\.0\.0\.1/);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/slack/event', () => {
    const api_path = '/api/slack/event';
    const service = build_service(app, api_path);

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
    });

    describe('type: event_callback', () => {
        const createIssueResponse = fixture('jira/issues.createIssue.response');
        const issue_key = createIssueResponse.key as string;

        describe('messages not on support thread', () => {
            const params = fixture('slack/events.channel_message') as Record<string, unknown>;

            it('will be ignored', () => {
                return service(params).expect(200);
            });
        });

        describe('messages on support thread', () => {
            // describe('without files', () => {
            //     const params = fixture('slack/events.message')

            //     it('will be ignored', () => {
            //         return service(params).expect(200);
            //     });
            // });

            describe('subtype: file_share', () => {
                const params = fixture('slack/events.message_with_file') as Record<string, unknown>;

                describe('when redis throws an error', () => {
                    it('logs the error', (done) => {
                        const key_error: Error = new Error('Some redis error');
                        storeGetSpy.mockImplementationOnce(() => {
                            return Promise.reject(key_error);
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
                        storeGetSpy.mockImplementationOnce(() => {
                            return Promise.resolve(null);
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

                it('add message as comment to Jira Issue', (done) => {
                    expect.assertions(2);
                    const getUserInfo = fixture('slack/users.info.response');
                    const checkJiraComment = (body: string) => {
                        expect(body).toContain('files.slack');
                        expect(body).toContain('Egon Spengler');

                        done();
                    };

                    nock('https://example.com')
                        .post(`/rest/api/2/issue/${issue_key}/comment`, (body) => {
                            checkJiraComment(JSON.stringify(body));

                            return body;
                        }).reply(200);

                    nock('https://slack.com')
                        .post('/api/users.info')
                        .reply(200, getUserInfo);

                    storeGetSpy.mockImplementationOnce(() => {
                        return Promise.resolve(issue_key);
                    });

                    service(params).expect(200).end((err) => {
                        if (err) {
                            return done(err);
                        }
                    });
                });
            });
        });
    });

    describe('when something goes wrong', () => {
        const params = {
            'team_id': 'BAD-TEAM-ID',
            'event': {}
        };

        it('logs the error', (done) => {
            service(params).expect(200).end((err) => {
                if (err) {
                    return done(err);
                }

                expect(logErrorSpy).toHaveBeenCalled();
                expect(logErrorSpy.mock.calls[0].toString())
                    .toContain('postEvent');
                done();
            });
        });
    });
});
