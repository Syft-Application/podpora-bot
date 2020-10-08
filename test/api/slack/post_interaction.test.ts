import nock from 'nock';
import { Logger } from 'winston';
import { build_service, build_response, fixture } from '../../helpers';
import logger from '../../../src/util/logger';
import { store } from '../../../src/util/secrets';

import app from '../../../src/app';

const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);
const postMessageResponse = fixture('slack/chat.postMessage.response');
const createIssueResponse = fixture('jira/issues.createIssue.response');
const issue_key = createIssueResponse.key as string;
const storeSetSpy = jest.spyOn(store, 'set');

beforeAll(() => {
    return nock.enableNetConnect(/localhost|127\.0\.0\.1/);
});

afterEach(() => {
    jest.clearAllMocks();
});

/*
  Any interactions with shortcuts, modals, or interactive components
  on Slack will be sent to this endpoint.
  (Handle dialog submissions from /support slash command)
*/
describe('POST /api/slack/interaction', () => {
    const api_path = '/api/slack/interaction';
    const service = build_service(app, api_path);

    describe('when parsing payload fails', () => {
        const bad_json_payload = 'this is not a json';
        const params = { payload: bad_json_payload };

        it('returns successfuly but logs the error', (done) => {
            expect.assertions(2);
            service(params).expect(200).end((err) => {
                if (err) {
                    done(err);
                }
                expect(logErrorSpy).toHaveBeenCalled();
                expect(logErrorSpy.mock.calls[0].toString())
                    .toContain('postInteraction');
                done();
            });
        });
    });

    describe('unknown interaction type', () => {
        const payload = {
            type: 'some_interaction',
            token: '6ato2RrVWQZwZ5Hwc91KnuTB',
            action_ts: '1591735130.109259',
            team: {
                id: 'T0001',
                domain: 'supportdemo'
            },
            user: {
                id: 'UHAV00MD0',
                name: 'joe_wick'
            },
            channel: {
                id: 'CHNBT34FJ',
                name: 'support'
            },
            callback_id: '12345',
            response_url: 'https://hooks.slack.com/app/response_url',
        };
        const params = { payload: JSON.stringify(payload) };

        it('returns successfuly but logs the error', (done) => {
            expect.assertions(3);

            service(params).expect(200).end((err) => {
                if (err) {
                    done(err);
                }

                expect(logErrorSpy).toHaveBeenCalled();
                const mock = logErrorSpy.mock;
                const calls = mock.calls[0].toString();
                expect(calls).toContain('postInteraction');
                expect(calls).toContain(payload.type);
                done();
            });
        });
    });

    function test_submission(params: Record<string, unknown>): void {
        it('returns 200 OK', (done) => {
            storeSetSpy.mockImplementationOnce(() => {
                done();
                return true;
            });

            nock('https://slack.com')
                .post('/api/chat.postMessage')
                .reply(200, postMessageResponse);

            nock('https://example.com')
                .post('/rest/api/2/issue')
                .reply(200, createIssueResponse);

            nock('https://example.com')
                .post(`/rest/api/2/issue/${issue_key}/remotelink`)
                .reply(200);

            nock('https://slack.com')
                .post('/api/chat.postMessage', new RegExp(issue_key))
                .reply(200, { ok: true });

            return service(params).expect(200, () => { true; });
        });

        describe('response.body', () => {
            const response = build_response(service(params));

            it('returns empty', (done) => {
                storeSetSpy.mockImplementationOnce(() => {
                    done();
                    return true;
                });

                nock('https://slack.com')
                    .post('/api/chat.postMessage')
                    .reply(200, postMessageResponse);

                nock('https://example.com')
                    .post('/rest/api/2/issue')
                    .reply(200, createIssueResponse);

                nock('https://example.com')
                    .post(`/rest/api/2/issue/${issue_key}/remotelink`)
                    .reply(200);

                nock('https://slack.com')
                    .post('/api/chat.postMessage', new RegExp(issue_key))
                    .reply(200, { ok: true });

                response((body: Record<string, unknown>) => {
                    expect(body).toEqual({});
                }, done);
            });
        });
    }


    describe('dialog_submission', () => {
        describe('support', () => {
            describe('bug report', () => {
                const submission = {
                    title: 'Android app is crashing',
                    description: 'pokojny vecer na vrsky padal',
                    expected: 'expected-foo',
                    currently: 'currently-baz'
                };
                const payload = {
                    type: 'dialog_submission',
                    token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                    action_ts: '1591735130.109259',
                    team: {
                        id: 'T0001',
                        domain: 'supportdemo'
                    },
                    user: {
                        id: 'UHAV00MD0',
                        name: 'joe_wick'
                    },
                    channel: {
                        id: 'CHNBT34FJ',
                        name: 'support'
                    },
                    submission: submission,
                    callback_id: '12345',
                    response_url: 'https://hooks.slack.com/app/response_url',
                    state: 'support_bug'
                };
                const params = { payload: JSON.stringify(payload) };

                test_submission(params);
            });

            describe('data request', () => {
                const submission = {
                    title: 'Active clients on platform',
                    description: 'please provide csv of all active employers'
                };
                const payload = {
                    type: 'dialog_submission',
                    token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                    action_ts: '1591735130.109259',
                    team: {
                        id: 'T0001',
                        domain: 'supportdemo'
                    },
                    user: {
                        id: 'UHAV00MD0',
                        name: 'joe_wick'
                    },
                    channel: {
                        id: 'CHNBT34FJ',
                        name: 'support'
                    },
                    submission: submission,
                    callback_id: 'abc1591734883700',
                    response_url: 'https://hooks.slack.com/app/response_url',
                    state: 'support_data'
                };
                const params = { payload: JSON.stringify(payload) };

                test_submission(params);
            });
        });

        describe('product', () => {
            const submission = {
                title: 'New £1_00_000 feature',
                description: 'redacted .)'
            };
            const payload = {
                type: 'dialog_submission',
                token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                action_ts: '1591735130.109259',
                team: {
                    id: 'T0001',
                    domain: 'productdemo'
                },
                user: {
                    id: 'UHAV00MD0',
                    name: 'joe_wick'
                },
                channel: {
                    id: 'CHNBT34FJ',
                    name: 'product'
                },
                submission: submission,
                callback_id: '12345',
                response_url: 'https://hooks.slack.com/app/response_url',
                state: 'product_idea'
            };
            const params = { payload: JSON.stringify(payload) };

            test_submission(params);
        });

        describe('unknown state', () => {
            const payload = {
                type: 'dialog_submission',
                token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                action_ts: '1591735130.109259',
                team: {
                    id: 'T0001',
                    domain: 'productdemo'
                },
                user: {
                    id: 'UHAV00MD0',
                    name: 'joe_wick'
                },
                channel: {
                    id: 'CHNBT34FJ',
                    name: 'support'
                },
                submission: {},
                callback_id: 'abc1591734883700',
                response_url: 'https://hooks.slack.com/app/response_url',
                state: 'UFO Enemy Unknown'
            };
            const params = { payload: JSON.stringify(payload) };

            it('returns 200 OK', (done) => {
                return service(params).expect(200, done);
            });

            it('returns successfuly but logs the error', (done) => {
                expect.assertions(3);

                service(params).expect(200).end((err) => {
                    if (err) {
                        done(err);
                    }

                    expect(logErrorSpy).toHaveBeenCalled();
                    const mock = logErrorSpy.mock;
                    const calls = mock.calls[0].toString();
                    expect(calls).toContain('postInteraction');
                    expect(calls).toContain(payload.state);
                    done();
                });
            });
        });
    });

    describe('view_submission', () => {
        describe('support', () => {
            describe('bug report', () => {
                const view = {
                    'private_metadata': 'support_bug',
                    'user': {
                        'id': 'UHAV00MD0',
                        'username': 'foo',
                        'name': 'bar',
                        'team_id': 'THS7JQ2RL'
                    },
                    'token': 'Shh_its_a_seekrit',
                    'trigger_id': '12466734323.1395872398',
                    'team': {
                        'id': 'THS7JQ2RL',
                        'domain': 'kudosdemo'
                    },
                    'state': {
                        'values': {
                            'sl_title_block': {
                                'sl_title': {
                                    'type': 'plain_text_input',
                                    'value': 'fii'
                                }
                            },
                            'ml_description_block': {
                                'ml_description': {
                                    'type': 'plain_text_input',
                                    'value': 'afdsfdsadfsaf'
                                }
                            },
                            'sl_currently_block': {
                                'sl_currently': {
                                    'type': 'plain_text_input',
                                    'value': 'fii'
                                }
                            },
                            'sl_expected_block': {
                                'sl_expected': {
                                    'type': 'plain_text_input',
                                    'value': 'fii'
                                }
                            },
                        }
                    }
                };
                const payload = {
                    type: 'view_submission',
                    token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                    action_ts: '1591735130.109259',
                    team: {
                        id: 'T0001',
                        domain: 'supportdemo'
                    },
                    user: {
                        id: 'UHAV00MD0',
                        name: 'joe_wick'
                    },
                    channel: {
                        id: 'CHNBT34FJ',
                        name: 'support'
                    },
                    view: view,
                    callback_id: '12345',
                    response_url: 'https://hooks.slack.com/app/response_url',
                    state: 'support_bug'
                };
                const params = { payload: JSON.stringify(payload) };

                test_submission(params);
            });

            describe('data request', () => {
                const view = {
                    'private_metadata': 'support_data',
                    'user': {
                        'id': 'UHAV00MD0',
                        'username': 'foo',
                        'name': 'bar',
                        'team_id': 'THS7JQ2RL'
                    },
                    'token': 'Shh_its_a_seekrit',
                    'trigger_id': '12466734323.1395872398',
                    'team': {
                        'id': 'THS7JQ2RL',
                        'domain': 'kudosdemo'
                    },
                    'state': {
                        'values': {
                            'sl_title_block': {
                                'sl_title': {
                                    'type': 'plain_text_input',
                                    'value': 'fii'
                                }
                            },
                            'ml_description_block': {
                                'ml_description': {
                                    'type': 'plain_text_input',
                                    'value': 'afdsfdsadfsaf'
                                }
                            }
                        }
                    }
                };
                const payload = {
                    type: 'view_submission',
                    token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                    action_ts: '1591735130.109259',
                    team: {
                        id: 'T0001',
                        domain: 'supportdemo'
                    },
                    user: {
                        id: 'UHAV00MD0',
                        name: 'joe_wick'
                    },
                    channel: {
                        id: 'CHNBT34FJ',
                        name: 'support'
                    },
                    view: view,
                    callback_id: '12345',
                    response_url: 'https://hooks.slack.com/app/response_url',
                    state: 'support_bug'
                };
                const params = { payload: JSON.stringify(payload) };

                test_submission(params);
            });
        });

        describe('unknown state', () => {
            const view = {
                'private_metadata': 'unknnown state',
            };
            const payload = {
                type: 'view_submission',
                token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                action_ts: '1591735130.109259',
                team: {
                    id: 'T0001',
                    domain: 'supportdemo'
                },
                user: {
                    id: 'UHAV00MD0',
                    name: 'joe_wick'
                },
                channel: {
                    id: 'CHNBT34FJ',
                    name: 'support'
                },
                view: view,
                callback_id: '12345',
                response_url: 'https://hooks.slack.com/app/response_url'
            };
            const params = { payload: JSON.stringify(payload) };

            it('returns 200 OK', (done) => {
                return service(params).expect(200, done);
            });

            it('returns successfuly but logs the error', (done) => {
                expect.assertions(3);

                service(params).expect(200).end((err) => {
                    if (err) {
                        done(err);
                    }

                    expect(logErrorSpy).toHaveBeenCalled();
                    const mock = logErrorSpy.mock;
                    const calls = mock.calls[0].toString();
                    expect(calls).toContain('postInteraction');
                    expect(calls).toContain(view.private_metadata);
                    done();
                });
            });
        });
    });
});
