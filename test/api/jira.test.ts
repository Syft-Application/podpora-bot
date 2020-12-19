import nock from 'nock';
import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { build_service, build_response, fixture, merge } from '../helpers';
import { store } from '../../src/util/secrets';
import app from '../../src/app';
import { Issue } from '../../src/lib/jira/api_interfaces';

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

    it('returns 200 OK', (done) => {
        service(params).expect(200).end((err) => {
            if (err) {
                return done(err);
            }

            done();
        });
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

        it('returns 404 Not found', (done) => {
            expect.assertions(1);
            const api_call = service(params);
            const response = build_response(api_call);

            api_call.expect(404);

            response((body: Record<string, unknown>) => {
                expect(JSON.stringify(body)).toContain('not found');

                done();
            }, done);
        });
    });

    describe('webhookEvent: jira:issue_updated status change', () => {
        const params = fixture('jira/webhook.issue_updated_status_change');
        storeGetSpy.mockImplementation(() => {
            return Promise.resolve('T0001,some_channel_id,some_thread_ts');
        });

        describe('slack thread not found', () => {
            it('silently ignores the event', (done) => {
                expect.assertions(1);
                storeGetSpy.mockImplementationOnce(() => {
                    return Promise.resolve(null);
                });

                service(params).expect(200).end((err) => {
                    if (err) {
                        return done(err);
                    }
                    expect(logErrorSpy).not.toHaveBeenCalled();
                    done();
                });
            });
        });

        describe('store returns an error', () => {
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

    describe('webhookEvent: jira:issue_updated file attachment added', () => {
        const params = fixture('jira/webhook.issue_file_attached');
        storeGetSpy.mockImplementation(() => {
            return Promise.resolve('T0001,some_channel_id,some_thread_ts');
        });

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

    // TODO Fix this
    // eslint-disable-next-line sonarjs/cognitive-complexity
    describe('webhookEvent: issuelink_created', () => {
        const params = {
            'webhookEvent': 'issuelink_created',
            'issueLink': {
                'id': 10002,
                'sourceIssueId': 10072,
                'destinationIssueId': 10088,
            }
        };
        const issue = fixture('jira/issue.getIssue');
        const inward_issue_link = {
            'id': '10002',
            'self': 'https://example-bot.atlassian.net/rest/api/2/issueLink/10002',
            'type': {
                'id': '10001',
                'name': 'Clones',
                'inward': 'is cloned by a i inward',
                'outward': 'clones b i outward',
                'self': 'https://example-bot.atlassian.net/rest/api/2/issueLinkType/10001'
            },
            'inwardIssue': {
                'id': '10088',
                'key': 'SUP-82',
                'self': 'https://example-bot.atlassian.net/rest/api/2/issue/10073',
                'fields': {
                    'summary': 'Some linked issue summary',
                    'status': { 'name': 'Backlog' },
                    'issuetype': {
                        'self': 'https://example-bot.atlassian.net/rest/api/2/issuetype/10002',
                        'id': '10002',
                        'name': 'Task'
                    }
                }
            }
        };
        const outward_issue_link = {
            'id': '10002',
            'self': 'https://example-bot.atlassian.net/rest/api/2/issueLink/10002',
            'type': {
                'id': '10001',
                'name': 'Clones',
                'inward': 'is cloned by c o inward',
                'outward': 'clones d o outward',
                'self': 'https://example-bot.atlassian.net/rest/api/2/issueLinkType/1001'
            },
            'outwardIssue': {
                'id': '10088',
                'key': 'SUP-82',
                'self': 'https://example-bot.atlassian.net/rest/api/2/issue/10073',
                'fields': {
                    'summary': 'Some linked issue summary',
                    'status': { 'name': 'In Progress' },
                    'issuetype': {
                        'self': 'https://example-bot.atlassian.net/rest/api/2/issuetype/10002',
                        'id': '10002',
                        'name': 'Task',
                    }
                }
            }
        };
        const issue_outward = merge(issue, {
            id: '10088',
            key: 'SUP-82'
        }) as unknown as Issue;
        const issue_inward = merge(issue, {
            id: '10072',
            key: 'SUP-72'
        }) as unknown as Issue;

        issue_outward.fields = merge(issue_outward.fields, {
            issuelinks: [outward_issue_link]
        }) as unknown as Issue['fields'];

        issue_inward.fields = merge(issue_inward.fields, {
            issuelinks: [inward_issue_link]
        }) as unknown as Issue['fields'];

        it('returns 200 OK and sends the links to slack thread', (done) => {
            expect.assertions(7);

            storeGetSpy.mockImplementation((k) => {
                expect(/10088|10072/.test(k)).toBe(true);

                if (/10088/.test(k)) {
                    return Promise.resolve('T0001,some_channel_id,outward_issue_thread_ts');
                } else {
                    return Promise.resolve('T0001,some_channel_id,inward_issue_thread_ts');
                }
            });

            nock('https://example.com')
                .get('/rest/agile/1.0/issue/10072')
                .reply(200, issue_inward);

            nock('https://example.com')
                .get('/rest/agile/1.0/issue/10088')
                .reply(200, issue_outward);

            let slack_updates = 0;

            const slackThreadUpdate = (body: Record<string, unknown>): boolean => {
                const api_call_body = JSON.stringify(body);

                // 10072 inward, cloned, source
                if (/inward_issue_thread_ts/.test(api_call_body)) {
                    expect(api_call_body).toContain('cloned');
                    expect(api_call_body).toContain('Backlog');
                    slack_updates = slack_updates + 1;
                } else {
                    // 10088 outward, clones, destination
                    expect(api_call_body).toContain('outward_issue_thread_ts');
                    expect(api_call_body).toContain('clones');
                    expect(api_call_body).toContain('In Progress');
                    slack_updates = slack_updates + 1;
                }

                if (slack_updates > 1) {
                    done();
                }

                return true;
            };

            nock('https://slack.com')
                .post('/api/chat.postMessage', slackThreadUpdate)
                .reply(200, { ok: true });

            nock('https://slack.com')
                .post('/api/chat.postMessage', slackThreadUpdate)
                .reply(200, { ok: true });

            serviceCall(params, done);
        });

        describe('slack thread not found', () => {
            it('returns 200 OK', (done) => {
                let store_calls = 0;

                storeGetSpy.mockImplementation(() => {
                    if (store_calls > 0) {
                        done();
                    } else {
                        store_calls = store_calls + 1;
                    }

                    return Promise.resolve(null);
                });

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10072')
                    .reply(200, issue);

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10088')
                    .reply(200, issue);

                serviceCall(params, done);
            });
        });

        describe('store returns an error', () => {
            it('logs the event', (done) => {
                expect.assertions(2);
                let store_calls = 0;

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10072')
                    .reply(200, issue);

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10088')
                    .reply(200, issue);

                storeGetSpy.mockImplementation(() => {
                    store_calls = store_calls + 1;
                    return Promise.reject(new Error('Some store error'));
                });

                logErrorSpy.mockImplementation((...args) => {
                    const log_args = JSON.stringify(args);
                    expect(log_args).toContain('Some store error');
                    if (store_calls > 1) {
                        done();
                    }

                    return logger;
                });

                serviceCall(params, done);
            });
        });

        describe('link not found', () => {
            it('returns 200 OK', (done) => {
                // expect.assertions(1);
                let store_calls = 0;
                const issue = fixture('jira/issue.getIssue') as unknown as Issue;
                issue.fields.issuelinks = [];

                storeGetSpy.mockImplementation(() => {
                    store_calls = store_calls + 1;
                    if (store_calls > 1) {
                        done();
                    }

                    return Promise.resolve('T0001,some_channel_id,some_thread_ts');
                });

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10072')
                    .reply(200, issue);

                nock('https://example.com')
                    .get('/rest/agile/1.0/issue/10088')
                    .reply(200, issue);

                serviceCall(params, done);
            });
        });
    });
});
