import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { fixture } from '../helpers';
import { store } from '../../src/util/secrets';

import {
    ChatPostMessageResult,
    SlackTeam
} from '../../src/lib/slack_team';

const postMsgResponse = fixture('slack/chat.postMessage.response') as ChatPostMessageResult;
const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(({} as unknown) as Logger);
const mock_team_config = { support_channel_id: 'channel-1234', api_token: 'foo' };
jest.spyOn(store, 'slackTeamConfig').mockReturnValue(mock_team_config);

afterEach(() => {
    jest.clearAllMocks();
});

describe('SlackTeam', () => {
    const team = new SlackTeam({ id: 'abc', domain: 'foo' });
    const postMessageMock = jest.spyOn(team.client.chat, 'postMessage');
    const dialogOpenMock = jest.spyOn(team.client.dialog, 'open');

    describe('#postSupportRequest(submission, state, user)', () => {
        const submission = {
            'title': 'Android app is crashing',
            'description': 'pokojny vecer na vrsky padal',
            'expected': 'foo',
            'currently': 'baz'
        };
        const state = 'bug';
        const user = {
            'id': 'UHAV00MD0',
            'name': 'joe_wick'
        };
        const support_request = {
            id: postMsgResponse.ts,
            team: team,
            user: user,
            submission: submission,
            type: state,
            channel: mock_team_config.support_channel_id
        };

        it('returns a Promise that resolves to SupportRequest', (done) => {
            postMessageMock.mockImplementation(() => {
                return Promise.resolve(postMsgResponse);
            });

            expect(team.postSupportRequest(submission, state, user))
                .resolves.toEqual(support_request);

            done();
        });

        it('sends the message to team slack', (done) => {
            postMessageMock.mockImplementation(() => {
                return Promise.resolve(postMsgResponse);
            });

            team.postSupportRequest(submission, state, user);
            const call = postMessageMock.mock.calls[0][0];
            expect(call.text).toEqual(expect.stringContaining(submission.title));
            expect(call.text).toEqual(expect.stringContaining(submission.description));
            expect(call.text).toEqual(expect.stringContaining(submission.expected));
            expect(call.text).toEqual(expect.stringContaining(submission.currently));
            expect(call.channel).toEqual('channel-1234');

            done();
        });

        describe('failure', () => {
            it('it log the failure and returns error response', (done) => {
                expect.assertions(2);

                postMessageMock.mockImplementation(() => {
                    return Promise.reject({ ok: false });
                });

                expect(team.postSupportRequest(submission, state, user))
                    .rejects.toEqual({ ok: false });

                team.postSupportRequest(submission, state, user).catch(() => {
                    expect(loggerSpy).toHaveBeenCalled();
                    done();
                });
            });
        });
    });

    describe('#showSupportRequestForm()', () => {
        const request_type = 'bug';
        const trigger_id = 'tr123';

        it('returns a Promise that resolves to slack WebAPICallResult', (done) => {
            dialogOpenMock.mockImplementation(() => {
                return Promise.resolve({ ok: true });
            });

            expect(team.showSupportRequestForm(request_type, trigger_id))
                .resolves.toEqual({ ok: true });

            done();
        });

        describe('failure', () => {
            it('it catch and log the failure', (done) => {
                expect.assertions(2);

                dialogOpenMock.mockImplementation(() => {
                    return Promise.reject({ ok: false });
                });

                expect(team.showSupportRequestForm(request_type, trigger_id))
                    .rejects.toEqual({ ok: false });
                team.showSupportRequestForm(request_type, trigger_id).catch(() => {
                    expect(loggerSpy).toHaveBeenCalled();
                    done();
                });
            });
        });
    });
});
