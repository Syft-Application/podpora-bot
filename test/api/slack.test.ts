import request from 'supertest';
// import mockDialogOpen from slack.mock must be before we import app
import { MockWebClient } from './slack.mock';
import { Logger } from 'winston';
import logger from '../../src/util/logger';

import app from '../../src/app';

const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(({} as unknown) as Logger);
const dialog = MockWebClient.prototype.dialog;

interface ServiceResponseCallback {
    (body: Record<string, unknown>): void;
}

interface Api {
    (): any;
}

function merge(target: any, source: any) {
    const target_copy = Object.assign({}, target);

    return Object.assign(target_copy, source);
}

function api() {
    return request(app);
}

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

    function service(params: Record<string, unknown>) {
        return api().post(api_path).send(params);
    }

    function response(params: Record<string, unknown>, callback: ServiceResponseCallback, done: jest.DoneCallback) {
        return service(params).end((err, res) => {
            if (err) {
                done(err);
            }
            return callback(res.body);
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

            it('contains command help message', (done) => {
                response(default_params, (body: Record<string, unknown>) => {
                    expect(body).toEqual(commandHelpResponse);
                    done();
                }, done);
            });
        });

        describe('text: bug', () => {
            const bug_params = merge(support_params, { text: 'bug' });
            it('sends dialog to Slack', (done) => {
                service(bug_params).expect(200).end((err, res) => {
                    if (err) {
                        done(err);
                    }

                    expect(dialog.open.mock.calls.length).toEqual(1);

                    done();
                });
            });

            describe('response.body', () => {
                it('returns empty', (done) => {
                    response(bug_params, (body: Record<string, unknown>) => {
                        expect(body).toEqual({});
                        done();
                    }, done);
                });
            });

            describe('when opening dialog fails', () => {
                it('logs the error', (done) => {
                    dialog.resolve = false;

                    service(bug_params).expect(200).end((err, res) => {
                        if (err) {
                            done(err);
                        }

                        expect(loggerSpy).toHaveBeenCalled();

                        done();
                    });
                });
            });
        });
    });
});

describe('POST /api/slack/event', () => {
    const api_path = '/api/slack/event';

    function service(params: Record<string, unknown>) {
        return api().post(api_path).send(params);
    }

    it('returns 200 OK', (done) => {
        return service({}).expect(200, done);
    });
});
