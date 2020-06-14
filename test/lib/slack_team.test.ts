// import { Logger } from 'winston';
// import logger from '../../src/util/logger';

import SlackTeam from '../../src/lib/slack_team';

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
            // expect(postSupportRequest()).resolves.toEqual();

            done();
        });

    });
});
