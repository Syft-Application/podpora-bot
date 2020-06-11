import request, * as supertest from 'supertest';
// import mockDialogOpen from slack.mock must be before we import app
import { MockWebClient } from '../mocks/slack.mock';
import { Logger } from 'winston';
import logger from '../../src/util/logger';

import { teamConfig } from '../../src/config/slack';
import app from '../../src/app';

const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(({} as unknown) as Logger);
const dialogSpy = MockWebClient.prototype.dialog;
const chatSpy = MockWebClient.prototype.chat;
const postMessage = chatSpy.postMessage;
const slack_team_config = teamConfig('slack-test-team-id');

interface ServiceResponseCallback {
    (body: Record<string, unknown>): void;
}

function merge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const target_copy = Object.assign({}, target);

    return Object.assign(target_copy, source);
}

function build_service(api_path: string) {
    return function(params: Record<string, unknown>): supertest.Test {
        return request(app).post(api_path).send(params);
    };
}

function build_response(service: supertest.Test) {
    return function(callback: ServiceResponseCallback, done: jest.DoneCallback): supertest.Test {
        // return service.end((err: any, res: Record<string, unknown>) => {
        return service.end((err: Error, res: supertest.Response) => {
            if (err) {
                done(err);
            }
            return callback(res.body);
        });
    };
}

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/slack/command', () => {
    const default_params = {
        token: 'token value',
        team_id: 'T0001',
        team_domain: 'example',
        enterprise_id: 'E0001',
        enterprise_name: 'Globular%20Construct%20Inc',
        channel_id: 'C2147483705',
        channel_name: 'test',
        user_id: 'U2147483697',
        user_name: 'Joe',
        command: '/some-command',
        text: '',
        response_url: 'https://hooks.slack.com/commands/1234/5678',
        trigger_id: '13345224609.738474920.8088930838d88f008e0'
    };

    const api_path = '/api/slack/command';
    const service = build_service(api_path);

    function test_support_command_with_dialog(params: Record<string, unknown>): void {
        it('sends dialog to Slack', (done) => {
            service(params).expect(200).end((err) => {
                if (err) {
                    done(err);
                }

                expect(dialogSpy.open.mock.calls.length).toEqual(1);

                done();
            });
        });

        describe('response.body', () => {
            const response = build_response(service(params));

            it('returns empty', (done) => {
                response((body: Record<string, unknown>) => {
                    expect(body).toEqual({});
                    done();
                }, done);
            });
        });

        describe('when opening dialog fails', () => {
            it('logs the error', (done) => {
                dialogSpy.resolve = false;

                service(params).expect(200).end((err) => {
                    if (err) {
                        done(err);
                    }

                    expect(loggerSpy).toHaveBeenCalled();

                    done();
                });
            });
        });
    }


    it('returns 200 OK', () => {
        return service(default_params).expect(200);
    });

    describe('command: /support', () => {
        const support_params = merge(default_params, { command: '/support' });

        describe('response.body', () => {
            const commandHelpResponse = {
                text: '👋 Need help with support bot?\n\n'
                    + '> Submit a request for data:\n>`/support data`\n\n'
                    + '> Submit a bug report:\n>`/support bug`'
            };
            const response = build_response(service(support_params));

            it('contains command help message', (done) => {
                response((body: Record<string, unknown>) => {
                    expect(body).toEqual(commandHelpResponse);
                    done();
                }, done);
            });
        });

        describe('text: bug', () => {
            const bug_params = merge(support_params, { text: 'bug' });

            test_support_command_with_dialog(bug_params);
        });


        describe('text: data', () => {
            const data_params = merge(support_params, { text: 'data' });

            test_support_command_with_dialog(data_params);
        });
    });
});

describe('POST /api/slack/event', () => {
    const api_path = '/api/slack/event';
    const service = build_service(api_path);

    it('returns 200 OK', (done) => {
        return service({}).expect(200, done);
    });

    describe('challenge', () => {
        const params = {
            'type': 'url_verification',
            'token': 'foo',
            'challenge': 'baz'
        };
        const response = build_response(service(params));

        it('responds back with the challenge', (done) => {
            response((body: Record<string, unknown>) => {
                expect(body.challenge).toEqual('baz');
                done();
            }, done);
        });
    });
});

/*
  Any interactions with shortcuts, modals, or interactive components
  on Slack will be sent to this endpoint.
  (Handle dialog submissions from /support slash command)
*/
describe('POST /api/slack/interaction', () => {
    const api_path = '/api/slack/interaction';
    const service = build_service(api_path);
    const submission = {
        'title': 'Android app is crashing',
        'reproduce': 'pokojny vecer na vrsky padal',
        'expected': 'foo',
        'currently': 'baz'
    };
    const default_payload = {
        'type': 'dialog_submission',
        'token': '6ato2RrVWQZwZ5Hwc91KnuTB',
        'action_ts': '1591735130.109259',
        'team': {
            'id': 'THS7JQ2RL',
            'domain': 'supportdemo'
        },
        'user': {
            'id': 'UHAV00MD0',
            'name': 'joe_wick'
        },
        'channel': {
            'id': 'CHNBT34FJ',
            'name': 'support'
        },
        'submission': submission,
        'callback_id': 'syft1591734883700',
        'response_url': 'https://hooks.slack.com/app/response_url',
        'state': 'bug'
    };
    const params = { payload: default_payload };

    it('returns 200 OK', (done) => {
        return service(params).expect(200, done);
    });

    it('post message to slack support channel with bug description', (done) => {
        service(params).expect(200).end((err) => {
            if (err) {
                done(err);
            }

            expect(postMessage.mock.calls.length).toEqual(1);
            const { text: msg_text, channel: msg_channel } = postMessage.mock.calls[0][0];

            expect(msg_channel).toEqual(slack_team_config.support_channel_id);
            expect(msg_text).toEqual(expect.stringContaining(submission.title));
            expect(msg_text).toEqual(expect.stringContaining(submission.reproduce));
            expect(msg_text).toEqual(expect.stringContaining(submission.expected));
            expect(msg_text).toEqual(expect.stringContaining(submission.currently));

            done();
        });
    });

    describe('data request submission', () => {
        const submission = {
            'title': 'Very Important Client report',
            'description': 'Can I please have foo in bar from baz for Fizz.'
        };

        const params = {
            payload: merge(default_payload,
                { state: 'data', submission: submission })
        };

        it('post message to slack support channel with data request description', (done) => {
            service(params).expect(200).end((err) => {
                if (err) {
                    done(err);
                }

                expect(postMessage.mock.calls.length).toEqual(1);
                const { text: msg_text, channel: msg_channel } = postMessage.mock.calls[0][0];

                expect(msg_channel).toEqual(slack_team_config.support_channel_id);
                expect(msg_text).toEqual(expect.stringContaining(submission.title));
                expect(msg_text).toEqual(expect.stringContaining(submission.description));

                done();
            });
        });
    });

    describe('post message to slack fails', () => {
        it('logs the error', (done) => {
            chatSpy.resolve = false;

            service(params).expect(200).end((err) => {
                if (err) {
                    done(err);
                }

                expect(loggerSpy).toHaveBeenCalled();
                const log_message = loggerSpy.mock.calls[0][0];
                expect(log_message).toEqual('Something went wrong with postMessage');

                done();
            });
        });

    });

    // const success_response = {
    //     "ok": true,
    //     "channel": "C1H9RESGL",
    //     "ts": "1503435956.000247",
    //     "message": {
    //         "text": "Here's a message for you",
    //         "username": "ecto1",
    //         "bot_id": "B19LU7CSY",
    //         "attachments": [],
    //         "type": "message",
    //         "subtype": "bot_message",
    //         "ts": "1503435956.000247"
    //     }
    // };

    xit('creates a jira ticket', (done) => {
        done();
    });
});
