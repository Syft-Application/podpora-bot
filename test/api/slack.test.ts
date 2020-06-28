import nock from 'nock';
import { Logger } from 'winston';
import { merge, build_service, build_response, fixture } from '../helpers';
import logger from '../../src/util/logger';
import { Issue } from '../../src/lib/jira';
import app from '../../src/app';
import { SubmissionType } from '../../src/lib/slack_team';

const logErrorSpy = jest.spyOn(logger, 'error')
    .mockReturnValue({} as Logger);
const logInfoSpy = jest.spyOn(logger, 'info')
    .mockReturnValue({} as Logger);
const createIssueResponse = fixture('jira/issues.createIssue.response') as Issue;

beforeAll(() => {
    return nock.enableNetConnect(/localhost|127\.0\.0\.1/);
});

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
    const service = build_service(app, api_path);

    function test_support_command_with_dialog(params: Record<string, unknown>): void {
        it('sends dialog to Slack', (done) => {
            nock('https://slack.com')
                .post('/api/dialog.open')
                .reply(200, { ok: true });

            service(params).expect(200).end((err) => {
                if (err) {
                    done(err);
                }

                done();
            });
        });

        describe('response.body', () => {
            const response = build_response(service(params));

            it('returns empty', (done) => {
                nock('https://slack.com')
                    .post('/api/dialog.open')
                    .reply(200, { ok: true });

                response((body: Record<string, unknown>) => {
                    expect(body).toEqual({});
                    done();
                }, done);
            });
        });

        describe('when something goes wrong (wrong team id)', () => {
            it('logs the error', (done) => {
                expect.assertions(2);
                const bad_params = merge(params, { team_id: 'wrong team id' });
                service(bad_params).expect(200).end((err) => {
                    if (err) {
                        done(err);
                    }
                    expect(logErrorSpy).toHaveBeenCalled();
                    expect(logErrorSpy.mock.calls[0].toString())
                        .toContain('postCommand');
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
    const service = build_service(app, api_path);

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

    describe('file_created', () => {
        const params = fixture('slack/events.file_created');

        it('returns 200 OK', (done) => {
            return service(params).expect(200, done);
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
});

/*
  Any interactions with shortcuts, modals, or interactive components
  on Slack will be sent to this endpoint.
  (Handle dialog submissions from /support slash command)
*/
describe('POST /api/slack/interaction', () => {
    const api_path = '/api/slack/interaction';
    const service = build_service(app, api_path);
    const submission = {
        'title': 'Android app is crashing',
        'description': 'pokojny vecer na vrsky padal',
        'expected': 'foo',
        'currently': 'baz'
    };
    const default_payload = {
        'type': 'dialog_submission',
        'token': '6ato2RrVWQZwZ5Hwc91KnuTB',
        'action_ts': '1591735130.109259',
        'team': {
            'id': 'T0001',
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
        'state': SubmissionType.BUG.toString()
    };
    const params = { payload: JSON.stringify(default_payload) };

    it('returns 200 OK', (done) => {
        nock('https://slack.com')
            .post('/api/chat.postMessage')
            .reply(200, { ok: true });

        nock('https://example.com')
            .post('/rest/api/2/issue')
            .reply(200, createIssueResponse);

        nock('https://slack.com')
            .post('/api/chat.postMessage', new RegExp(createIssueResponse.key))
            .reply(200, { ok: true });

        return service(params).expect(200, done);
    });

    describe('when creating jira ticket fails', () => {
        it('logs the error', (done) => {
            expect.assertions(2);
            const bad_payload = merge(
                default_payload,
                { team: { id: 'wrong team id', domain: 'foo' } }
            );
            const params = { payload: JSON.stringify(bad_payload) };
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
});
