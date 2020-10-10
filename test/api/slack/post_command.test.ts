import nock from 'nock';
import { Logger } from 'winston';
import { merge, build_service, build_response } from '../../helpers';
import logger from '../../../src/util/logger';
import app from '../../../src/app';

const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);

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
        command: '/support',
        text: '',
        response_url: 'https://hooks.slack.com/commands/1234/5678',
        trigger_id: '13345224609.738474920.8088930838d88f008e0'
    };
    const api_path = '/api/slack/command';
    const service = build_service(app, api_path);

    function test_command_with_modal(params: Record<string, unknown>): void {
        it('sends modal view to Slack', (done) => {
            nock('https://slack.com')
                .post('/api/views.open')
                .reply(200, { ok: true });

            service(params).expect(200).end(done);
        });

        describe('response.body', () => {
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

            it('notify user about issue', (done) => {
                const bad_params = merge(params, { team_id: 'wrong team id' });
                const response = build_response(service(bad_params));

                response((body: Record<string, unknown>) => {
                    const body_str = JSON.stringify(body);
                    expect(body_str).toContain('Something went wrong');
                    done();
                }, done);
            });
        });
    }

    function test_command_help(
        params: Record<string, unknown>,
        commandHelpResponse: { text: string }
    ): void {
        const response = build_response(service(params));

        it('contains command help message', (done) => {
            response((body: Record<string, unknown>) => {
                expect(body).toEqual(commandHelpResponse);
                done();
            }, done);
        });
    }

    it('returns 200 OK', () => {
        return service(default_params).expect(200);
    });

    describe('command: /support', () => {
        const support_params = merge(default_params, { command: '/support' });

        describe('text: bug', () => {
            const bug_params = merge(support_params, { text: 'bug' });

            test_command_with_modal(bug_params);
        });

        describe('text: data', () => {
            const data_params = merge(support_params, { text: 'data' });

            test_command_with_modal(data_params);
        });

        describe('text: ping', () => {
            const params = merge(support_params, { text: 'ping' });
            const response = build_response(service(params));

            it('respond with ephemeral message Pong!', (done) => {
                response((body: Record<string, unknown>) => {
                    expect(body).toEqual({
                        response_type: 'ephemeral',
                        text: 'Pong!'
                    });
                    done();
                }, done);
            });
        });

        describe('text: anything than bug, data or ping', () => {
            const commandHelpResponse = {
                text: '👋 Need help with support bot?\n\n'
                    + '> Submit a request for data:\n>`/support data`\n\n'
                    + '> Submit a bug report:\n>`/support bug`'
            };

            test_command_help(support_params, commandHelpResponse);
        });
    });

    describe('command: /idea', () => {
        const product_params = merge(default_params, { command: '/idea' });

        describe('text: help', () => {
            const idea_params = merge(product_params, { text: 'help' });
            const commandHelpResponse = {
                text: '👋 Need help with product bot?\n\n'
                    + '> Submit new product idea:\n>`/idea`'
            };
            test_command_help(idea_params, commandHelpResponse);
        });

        describe('text: nothing', () => {
            const idea_params = merge(product_params, { text: ' ' });

            test_command_with_modal(idea_params);
        });
    });

    describe('command: /unknown', () => {
        const params = merge(default_params, { command: '/unknown' });
        const response = build_response(service(params));

        it('notify user that the command is not implemented yet', (done) => {
            response((body: Record<string, unknown>) => {
                const body_str = JSON.stringify(body);
                expect(body_str).toContain('Unknown or not implemented command');
                done();
            }, done);
        });
    });
});
