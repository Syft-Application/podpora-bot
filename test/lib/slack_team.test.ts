// import { Logger } from 'winston';
// import logger from '../../src/util/logger';
import { fixture } from '../helpers';
import { WebAPICallResult } from '@slack/web-api';

import SlackTeam from '../../src/lib/slack_team';

const postMsgResponse = fixture('slack/chat.postMessage.response') as WebAPICallResult;

describe('SlackTeam', () => {
    const team = new SlackTeam({ id: 'abc', domain: 'foo' });
    const postMessageMock = jest.spyOn(team.client.chat, 'postMessage');
    it('exists', (done) => {
        expect(SlackTeam).toBeDefined();

        done();
    });

    describe('#postSupportRequest', () => {
        it('exists', (done) => {
            expect(team.postSupportRequest).toBeDefined();

            done();
        });

        it('returns a Promise', (done) => {
            postMessageMock.mockImplementation(() => {
                return Promise.resolve(postMsgResponse);
            });

            expect(team.postSupportRequest()).resolves.toEqual(postMsgResponse);

            done();
        });

    });
});
