import nock from 'nock';
import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { build_service, build_response, fixture } from '../helpers';
import { store } from '../../src/util/secrets';
import app from '../../src/app';

import feature from './../../src/util/feature';
const featureSpy = jest.spyOn(feature, 'is_enabled');

const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);
// const logInfoSpy = jest.spyOn(logger, 'info').mockReturnValue({} as Logger);
const storeGetSpy = jest.spyOn(store, 'get');

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
    type CallbackHandler = (err: Error) => void;

    function serviceCall(params: Record<string, unknown>, callback: CallbackHandler): void {
        service(params).expect(200)
            .end((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    storeGetSpy.mockImplementation(() => {
        return Promise.resolve('T0001,some_channel_id,some_thread_ts');
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

    describe('jira config not found', () => {
        const api_path = '/api/jira/event/BAD-TEAM-ID';
        const service = build_service(app, api_path);
        const params = {};

        it('returns 200 OK', () => {
            return service(params).expect(200);
        });
    });

    describe('slack thread not found', () => {
        const params = fixture('jira/webhook.issue_updated_status_change');

        it('logs the event', (done) => {
            expect.assertions(2);
            storeGetSpy.mockImplementationOnce(() => {
                return Promise.resolve(null);
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
            storeGetSpy.mockImplementationOnce(() => {
                return Promise.reject(new Error('Some store error'));
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
                expect.assertions(6);

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
                    expect(api_call_body).toContain('changed from');
                    expect(api_call_body).toContain('Backlog');
                    expect(api_call_body).toContain('Selected for Development');
                    done();
                });
            });

            describe('status: Done with resolution', () => {
                const params = fixture('jira/webhook.issue_updated_status_change2');

                it('includes the resolution in Slack message', (done) => {
                    let api_call_body: string;
                    expect.assertions(7);

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
                        expect(api_call_body).toContain('changed from');
                        expect(api_call_body).toContain('Selected for Development');
                        expect(api_call_body).toContain('Done');
                        expect(api_call_body).toContain('Duplicate');

                        done();
                    });
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
                    expect(api_call_body).toContain('has been attached');
                    done();
                });
            });

            describe('attachment not found in jira.fields.attachment', () => {
                it('returns 200 OK', () => {
                    const invalid_params = {
                        webhookEvent: 'jira:issue_updated',
                        issue_event_type_name: 'issue_updated',
                        user: {},
                        issue: {
                            id: '10057',
                            self: 'https://example.atlassian.net/rest/api/2/10057',
                            key: 'SUP-58',
                            fields: {
                                attachment: []
                            }
                        },
                        'changelog': {
                            items: [
                                {
                                    field: 'Attachment',
                                    fieldtype: 'jira',
                                    fieldId: 'attachment',
                                    from: null,
                                    fromString: null,
                                    to: '10000',
                                    toString: 'dummy.png'
                                }
                            ]
                        }
                    };

                    return service(invalid_params).expect(200);
                });
            });

        });
    });

    describe('webhookEvent: issuelink_created', () => {
        const params = {
            'timestamp': 1607259320352,
            'webhookEvent': 'issuelink_created',
            'issueLink': {
                'id': 10004,
                'sourceIssueId': 10072,
                'destinationIssueId': 10088,
                'issueLinkType': {
                    'id': 10000,
                    'name': 'Blocks',
                    'outwardName': 'blocks',
                    'inwardName': 'is blocked by',
                    'isSubTaskLinkType': false,
                    'isSystemLinkType': false
                },
                'systemLink': false
            }
        };

        it('returns 200 OK and sends the links to slack thread', (done) => {
            const issue = fixture('jira/issue.getIssue');
            featureSpy.mockImplementationOnce((key) => {
                return key == 'jira_links_change_updates';
            });

            storeGetSpy.mockImplementation(() => {
                return Promise.resolve('T0001,some_channel_id,some_thread_ts');
            });

            expect.assertions(3);
            nock('https://example.com')
                .get('/rest/agile/1.0/issue/10072')
                .reply(200, issue);

            nock('https://slack.com')
                .post('/api/chat.postMessage', (body) => {
                    const api_call_body = JSON.stringify(body);
                    expect(api_call_body).toContain('relates to');
                    expect(api_call_body).toContain('is cloned by');
                    expect(api_call_body).toContain('is duplicated by');

                    done();
                    return body;
                })
                .reply(200, { ok: true });

            serviceCall(params, done);
        });

        describe('slack thread not found', () => {
            it('returns 200 OK', (done) => {
                const issue = fixture('jira/issue.getIssue');
                featureSpy.mockImplementationOnce((key) => {
                    return key == 'jira_links_change_updates';
                });

                storeGetSpy.mockImplementation(() => {
                    done();
                    return Promise.resolve(null);
                });

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10072')
                    .reply(200, issue);

                serviceCall(params, done);
            });
        });

        describe('store returns an error', () => {
            it('logs the event', (done) => {
                const issue = fixture('jira/issue.getIssue');
                featureSpy.mockImplementationOnce((key) => {
                    return key == 'jira_links_change_updates';
                });

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10072')
                    .reply(200, issue);

                expect.assertions(1);
                storeGetSpy.mockImplementationOnce(() => {
                    done();
                    return Promise.reject(new Error('Some store error'));
                });

                logErrorSpy.mockImplementationOnce((...args) => {
                    const log_args = JSON.stringify(args);
                    expect(log_args).toContain('Some store error');
                    done();
                    return logger;
                });

                serviceCall(params, done);
            });

            describe('when feature jira_links_change_updates is not enabled', () => {
                it('ignores the event', () => {
                    return service(params).expect(200);
                });
            });
        });
    });
});
