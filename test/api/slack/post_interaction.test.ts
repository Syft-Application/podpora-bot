import nock from 'nock';
import { Logger } from 'winston';
import { build_service, build_response, fixture, merge } from '../../helpers';
import logger from '../../../src/util/logger';
import feature from '../../../src/util/feature';
import { store } from '../../../src/util/secrets';
import {
    ViewSubmission,
    ViewSubmissionSelectValue,
    PostInteractionPayload
} from '../../../src/lib/slack/api_interfaces';

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

    describe('view_submission', () => {
        const payload = function(view: Record<string, unknown>): Record<string, unknown> {
            return {
                type: 'view_submission',
                token: '6ato2RrVWQZwZ5Hwc91KnuTB',
                action_ts: '1591735130.109259',
                team: {
                    id: 'T0001',
                    domain: 'viewdemo'
                },
                user: {
                    id: 'UHAV00MD0',
                    name: 'joe_wick'
                },
                channel: {
                    id: 'CHNBT34FJ',
                    name: 'foobar'
                },
                view: view,
                callback_id: '12345',
                response_url: 'https://hooks.slack.com/app/response_url'
            };
        };
        describe('support', () => {
            describe('bug report', () => {
                const view = {
                    'private_metadata': 'support_bug',
                    'user': {
                        'id': 'UHAV00MD0',
                        'username': 'foo-username',
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
                const params = { payload: JSON.stringify(payload(view)) };

                test_submission(params);
            });

            describe('data request', () => {
                const view = {
                    'private_metadata': 'support_data',
                    'user': {
                        'id': 'UHAV00MD0',
                        'username': 'foo-username',
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
                const params = { payload: JSON.stringify(payload(view)) };

                test_submission(params);
            });
        });

        describe('product', () => {
            const view = fixture('product/idea_submission');
            const params = { payload: JSON.stringify(payload(view)) };

            test_submission(params);

            describe('with missing optional select value', () => {
                const view2 = view as ViewSubmission['view'];
                const nullify = (view: ViewSubmission['view'], id: string): void => {
                    const vals = view.state.values;
                    const select_elm = vals[id + '_block'][id] as ViewSubmissionSelectValue;
                    select_elm.selected_option = null;
                };
                nullify(view2, 'sl_urgency');
                nullify(view2, 'sl_product_area');
                const params = { payload: JSON.stringify(payload(view2)) };

                test_submission(params);
            });
        });

        describe('unknown state', () => {
            const view = {
                'private_metadata': 'unknnown state',
            };
            const params = { payload: JSON.stringify(payload(view)) };

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

    describe('shortcut', () => {
        const payload = {
            type: 'shortcut',
            token: 'sikrit token',
            action_ts: '1591735130.109259',
            team: {
                id: 'T0001',
                domain: 'viewdemo'
            },
            user: {
                id: 'UHAV00MD0',
                name: 'joe_wick'
            },
            channel: {
                id: 'CHNBT34FJ',
                name: 'foobar-channel'
            },
            callback_id: 'foo-callback-id',
            response_url: 'https://hooks.slack.com/app/response_url'
        };

        function test_shortcut_with_modal(params: Record<string, unknown>): void {
            const featureSpy = jest.spyOn(feature, 'is_enabled');
            function modalsEnabled(name: string): boolean {
                return name == 'slack_modals';
            }

            it('sends modal view to Slack', (done) => {
                featureSpy.mockImplementationOnce(modalsEnabled);
                nock('https://slack.com')
                    .post('/api/views.open')
                    .reply(200, { ok: true });

                service(params).expect(200).end(done);
            });

            describe('response.body', () => {
                featureSpy.mockImplementationOnce(modalsEnabled);
                const response = build_response(service(params));

                it('returns empty', (done) => {
                    nock('https://slack.com')
                        .post('/api/views.open')
                        .reply(200, { ok: true });

                    response((body: Record<string, unknown>) => {
                        expect(body).toEqual({});
                        done();
                    }, done);
                });
            });
        }

        it('returns 200 OK', (done) => {
            const logDebugSpy = jest.spyOn(logger, 'debug').mockReturnValue({} as Logger);
            const params = { payload: JSON.stringify(payload) };

            service(params).expect(200).end((err) => {
                expect(logErrorSpy).not.toHaveBeenCalled();
                expect(logDebugSpy).toHaveBeenCalled();

                done(err);
            });
        });

        describe('callback_id: support_bug', () => {
            const bug_payload = merge<PostInteractionPayload>(
                payload, { callback_id: 'support_bug' }
            );

            test_shortcut_with_modal({ payload: JSON.stringify(bug_payload) });
        });

        describe('callback_id: support_data', () => {
            const data_payload = merge<PostInteractionPayload>(
                payload, { callback_id: 'support_data' }
            );

            test_shortcut_with_modal({ payload: JSON.stringify(data_payload) });
        });

        describe('callback_id: support_unknown-command', () => {
            const shortcut_payload = merge<PostInteractionPayload>(
                payload, { callback_id: 'support_unknown-command' }
            );

            it('returns 200 OK and log the callback id for debugging', (done) => {
                const logDebugSpy = jest.spyOn(logger, 'debug').mockReturnValue({} as Logger);
                const params = { payload: JSON.stringify(shortcut_payload) };

                service(params).expect(200).end((err) => {
                    const log_msg = logDebugSpy.mock.calls[0].toString();
                    expect(logErrorSpy).not.toHaveBeenCalled();
                    expect(logDebugSpy).toHaveBeenCalled();
                    expect(log_msg).toContain('handleShortcut');
                    expect(log_msg).toContain('support_unknown-command');

                    done(err);
                });
            });
        });
    });

    describe('block_actions', () => {
        const payload = {
            type: 'block_actions',
            token: 'sikrit token',
            action_ts: '1591735130.109259',
            team: {
                id: 'T0001',
                domain: 'viewdemo'
            },
            user: {
                id: 'UHAV00MD0',
                name: 'joe_wick'
            },
            channel: {
                id: 'CHNBT34FJ',
                name: 'foo-channel'
            },
            callback_id: 'foo-callback-id',
            response_url: 'https://hooks.slack.com/app/response_url'
        };

        it('returns 200 OK', (done) => {
            const logDebugSpy = jest.spyOn(logger, 'debug').mockReturnValue({} as Logger);
            const params = { payload: JSON.stringify(payload) };

            service(params).expect(200).end((err) => {
                const log_msg = logDebugSpy.mock.calls[0].toString();
                expect(logErrorSpy).not.toHaveBeenCalled();
                expect(logDebugSpy).toHaveBeenCalled();
                expect(log_msg).toContain('block_actions');

                done(err);
            });
        });
    });
});
