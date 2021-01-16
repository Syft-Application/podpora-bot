import nock from 'nock';
import { Logger } from 'winston';
import { mergeg, build_service, build_response, fixture } from '../../helpers';
import logger from '../../../src/util/logger';
import { store } from '../../../src/util/secrets';
import {
    EventCallbackPayload,
    PostEventPayloads
} from '../../../src/lib/slack/api_interfaces';
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
        } as PostEventPayloads;
        const response = build_response(service(params));

        it('responds back with the challenge param', (done) => {
            response((body: Record<string, unknown>) => {
                expect(body.challenge).toEqual('dummy challenge');
                done();
            }, done);
        });
    });

    describe('type: event_callback', () => {
        describe('subtype: not a file_share event', () => {
            const dummy_event = {
                ts: 'not important',
                type: 'dummy',
                channel: 'dummy',
                thread_ts: 'foo-thread-ts'
            };
            const params = {
                type: 'event_callback',
                token: 'dummy token',
                subtype: 'not a file share',
                team_id: 'T001',
                event: dummy_event
            } as EventCallbackPayload;

            it('will be ignored', () => {
                return service(params).expect(200);
            });
        });

        function test_file_share_on_supported_channel(params: EventCallbackPayload): void {
            const createIssueResponse = fixture('jira/issues.createIssue.response');
            const issue_key = createIssueResponse.key as string;

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

            it('add message as comment to Jira Issue', (done) => {
                expect.assertions(2);
                const getUserInfo = fixture('slack/users.info.response');
                const checkJiraComment = (body: string): void => {
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

            describe('message not in a thread', () => {
                const not_in_thread_params = mergeg<EventCallbackPayload>(params, {
                    'event': mergeg<EventCallbackPayload['event']>(
                        params['event'], {
                            thread_ts: undefined
                        })
                });

                it('will be ignored', () => {
                    return service(not_in_thread_params).expect(200);
                });
            });
        }

        describe('subtype: file_share', () => {
            const default_params =
                fixture('slack/events.message_with_file') as EventCallbackPayload;

            describe('message on support channel', () => {
                const params = mergeg<EventCallbackPayload>(
                    default_params, {
                        'event': mergeg<EventCallbackPayload['event']>(
                            default_params['event'], { channel: 'suppchannel' }
                        )
                    });

                test_file_share_on_supported_channel(params);
            });

            describe('message on product channel', () => {
                const params = mergeg<EventCallbackPayload>(
                    default_params, {
                        'event': mergeg<EventCallbackPayload['event']>(
                            default_params['event'], { channel: 'prodchannel' }
                        )
                    });

                test_file_share_on_supported_channel(params);
            });

            describe('message not on support or product channel', () => {
                const params = mergeg<EventCallbackPayload>(
                    default_params, {
                        'event': mergeg<EventCallbackPayload['event']>(
                            default_params['event'], { channel: 'unknownchannel' }
                        )
                    });

                it('will be ignored', () => {
                    return service(params).expect(200);
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
