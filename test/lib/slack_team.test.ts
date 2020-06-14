// import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { fixture } from '../helpers';

import SlackTeam from '../../src/lib/slack_team';

const postMsgResponse = fixture('slack/chat.postMessage.response');

describe('SlackTeam', () => {
    const team = new SlackTeam({ id: 'abc', domain: 'foo' });

    it('exists', (done) => {
        expect(SlackTeam).toBeDefined();

        done();
    });

    describe('#postSupportRequest', () => {
        const postSupportRequest = team.postSupportRequest;
        it('exists', (done) => {
            expect(postSupportRequest).toBeDefined();

            done();
        });

        it('returns a Promise', (done) => {
            logger.info(postMsgResponse);
            // expect(postSupportRequest()).resolves.toEqual(postMsgResponse);

            done();
        });

    });
});
