import nock from 'nock';
import { Logger } from 'winston';
import { fixture } from '../helpers';
import logger from '../../src/util/logger';
import {
    SlackMessage,
    SlackTeam
} from '../../src/lib/slack_team';

import {
    support
} from '../../src/lib/support';

const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);
beforeAll(() => {
    return nock.disableNetConnect();
});

afterAll(() => {
    return nock.enableNetConnect();
});

afterEach(() => {
    jest.clearAllMocks();
});

const team_config = {
    id: 'abc',
    support_channel_id: 'channel-1234',
    api_token: 'dummy api token',
    domain: 'qwerty'
};
const team = new SlackTeam(team_config);
const postMsgResponse = fixture('slack/chat.postMessage.response');
const slack_message = postMsgResponse as SlackMessage;

describe('#postIssueUrlOnThread(url, )', () => {
    const url = 'https://podpora-bot.atlassian.net/issue/10008';
    it('returns a Promise that resolves to SupportRequest', (done) => {
        expect.assertions(1);
        nock('https://slack.com')
            .post('/api/chat.postMessage')
            .reply(200, { ok: true });

        support.postIssueUrlOnThread(team, url, slack_message)
            .then((res) => {
                expect(res.ok).toEqual(true);
                done();
            });
    });

    describe('failure', () => {
        it('it log the failure and returns error response', (done) => {
            expect.assertions(3);
            nock('https://slack.com')
                .post('/api/chat.postMessage')
                .reply(200, { ok: false });

            support.postIssueUrlOnThread(team, url, slack_message)
                .catch((error) => {
                    expect(error.message).toContain('postIssueUrlOnThread');
                    expect(loggerSpy).toHaveBeenCalled();
                    const logger_call = loggerSpy.mock.calls[0].toString();
                    expect(logger_call).toEqual(
                        expect.stringContaining('postIssueUrlOnThread')
                    );
                    done();
                });
        });
    });
});

describe('#showForm()', () => {
    describe('when something goes wrong (api call)', () => {
        // when trying set reply http status anything else than 200 ;/
        // "[WARN]  web-api:WebClient:0 http request failed Nock: No match for request {
        it('logs the error', (done) => {
            expect.assertions(2);
            nock('https://slack.com')
                .post('/api/dialog.open')
                .reply(200, { ok: false });

            support.showForm(team, 'bug', 'abc')
                .catch(() => {
                    expect(loggerSpy).toHaveBeenCalled();
                    const logger_call = loggerSpy.mock.calls[0].toString();

                    expect(logger_call).toEqual(
                        expect.stringContaining('showForm')
                    );
                    done();
                });
        });
    });
});
