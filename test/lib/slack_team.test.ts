import nock from 'nock';
import { Logger } from 'winston';
import { fixture } from '../helpers';
import logger from '../../src/util/logger';
import {
    SlackMessage,
    SlackTeam
} from '../../src/lib/slack_team';
import { supportMessageText } from '../../src/lib/support_requests/default_support_requests';
const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);

afterEach(() => {
    jest.clearAllMocks();
});

describe('SlackTeam', () => {
    const team_config = {
        id: 'abc',
        support_channel_id: 'channel-1234',
        api_token: 'dummy api token',
        domain: 'qwerty'
    };
    const team = new SlackTeam(team_config);
    const postMsgResponse = fixture('slack/chat.postMessage.response');
    const slack_message = postMsgResponse as SlackMessage;

    describe('#postMessage(message_text, channel_id)', () => {
        const submission = {
            title: 'title of reported bug',
            description: 'description of problem',
            expected: 'expected outcome ',
            currently: 'current state'
        };
        const user = {
            id: 'UHAV00MD0',
            name: 'joe_wick'
        };
        const request_type = 'bug';
        const message_text = supportMessageText(submission, user, request_type);
        const channel_id = team.support_channel_id;

        it('returns a Promise that resolves to SlackMessage', (done) => {
            expect.assertions(1);
            nock('https://slack.com')
                .post('/api/chat.postMessage')
                .reply(200, postMsgResponse);

            team.postMessage(message_text, channel_id)
                .then((res) => {
                    expect(res).toEqual(slack_message);
                    done();
                });
        });

        describe('failure', () => {
            it('it log the failure and returns error response', (done) => {
                expect.assertions(3);
                nock('https://slack.com')
                    .post('/api/chat.postMessage')
                    .reply(200, { ok: false });

                team.postMessage(message_text, channel_id)
                    .catch((res) => {
                        // expect(res).toEqual({ ok: false });
                        expect(res instanceof Error).toEqual(true);
                        expect(loggerSpy).toHaveBeenCalled();
                        const logger_call = loggerSpy.mock.calls[0].toString();
                        expect(logger_call).toEqual(
                            expect.stringContaining('postMessage')
                        );
                        done();
                    });
            });
        });

        describe('data request', () => {
            const submission = {
                title: 'Very important title',
                description: 'Please provide some data',
            };
            const request_type = 'data';
            const message_text = supportMessageText(submission, user, request_type);

            it('returns a Promise that resolves to SlackMessage', (done) => {
                expect.assertions(1);
                nock('https://slack.com')
                    .post('/api/chat.postMessage', new RegExp('data'))
                    .reply(200, postMsgResponse);

                team.postMessage(message_text, channel_id)
                    .then((res) => {
                        expect(res).toEqual(slack_message);
                        done();
                    });
            });
        });
    });
});
