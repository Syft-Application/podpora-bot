import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { fixture } from '../helpers';

import {
    ChatPostMessageResult,
    SlackTeam
} from '../../src/lib/slack_team';

const postMsgResponse = fixture('slack/chat.postMessage.response') as ChatPostMessageResult;
const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(({} as unknown) as Logger);

afterEach(() => {
    jest.clearAllMocks();
});

describe('SlackTeam', () => {
    const team = new SlackTeam({ id: 'abc', domain: 'foo' });
    team.config = { support_channel_id: 'channel-1234' };
    const postMessageMock = jest.spyOn(team.client.chat, 'postMessage');
    it('exists', (done) => {
        expect(SlackTeam).toBeDefined();

        done();
    });

    describe('#postSupportRequest', () => {
        it('returns a Promise that resolves to slack WebAPICallResult', (done) => {
            postMessageMock.mockImplementation(() => {
                return Promise.resolve(postMsgResponse);
            });

            expect(team.postSupportRequest()).resolves.toEqual(postMsgResponse);

            done();
        });

        describe('failure', () => {
            it('it catch and log the failure', (done) => {
                postMessageMock.mockImplementation(() => {
                    return Promise.reject({ ok: false });
                });


                expect(team.postSupportRequest()).rejects.toEqual({ ok: false });
                team.postSupportRequest().catch(() => {
                    expect(loggerSpy).toHaveBeenCalled();
                });

                done();
            });
        });
    });
});
