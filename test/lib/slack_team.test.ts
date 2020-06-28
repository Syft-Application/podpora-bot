import nock from 'nock';
import { Logger } from 'winston';
import { fixture } from '../helpers';
import logger from '../../src/util/logger';
import {
    SubmissionType,
    SlackTeam
} from '../../src/lib/slack_team';

const postMsgResponse = fixture('slack/chat.postMessage.response');
const loggerSpy = jest.spyOn(logger, 'error')
    .mockReturnValue({} as Logger);
beforeAll(() => {
    return nock.disableNetConnect();
});

afterAll(() => {
    return nock.enableNetConnect();
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('SlackTeam', () => {
    const team_config = {
        id: 'abc',
        support_channel_id: 'channel-1234',
        api_token: 'foo',
        domain: 'qwerty'
    };
    const team = new SlackTeam(team_config);

    describe('#postSupportRequest(submission, user)', () => {
        const submission = {
            'title': 'Android app is crashing',
            'description': 'pokojny vecer na vrsky padal',
            'expected': 'foo',
            'currently': 'baz',
            'type': SubmissionType.BUG
        };
        const user = {
            'id': 'UHAV00MD0',
            'name': 'joe_wick'
        };
        const support_request = {
            id: postMsgResponse.ts,
            team_id: team.id,
            user: user,
            submission: submission,
            type: submission.type,
            url: 'https://qwerty.slack.com/archives/channel-1234/p1592066203.000100',
            channel: team_config.support_channel_id
        };

        it('returns a Promise that resolves to SupportRequest', (done) => {
            expect.assertions(1);
            nock('https://slack.com')
                .post('/api/chat.postMessage', new RegExp('crashing'))
                .reply(200, postMsgResponse);

            team.postSupportRequest(submission, user)
                .then((res) => {
                    expect(res).toEqual(support_request);
                    done();
                });
        });

        describe('failure', () => {
            it('it log the failure and returns error response', (done) => {
                expect.assertions(3);
                nock('https://slack.com')
                    .post('/api/chat.postMessage', new RegExp('crashing'))
                    .reply(200, { ok: false });

                team.postSupportRequest(submission, user)
                    .catch((res) => {
                        // expect(res).toEqual({ ok: false });
                        expect(res instanceof Error).toEqual(true);
                        expect(loggerSpy).toHaveBeenCalled();
                        const logger_call = loggerSpy.mock.calls[0].toString();
                        expect(logger_call).toEqual(
                            expect.stringContaining('postSupportRequest')
                        );
                        done();
                    });
            });
        });
    });

    describe('#showSupportRequestForm()', () => {
        const request_type = SubmissionType.BUG;
        const trigger_id = 'tr123';

        it('returns a Promise that resolves to slack WebAPICallResult', (done) => {
            expect.assertions(1);
            nock('https://slack.com')
                .post('/api/dialog.open', new RegExp(trigger_id))
                .reply(200, { ok: true });

            team.showSupportRequestForm(request_type, trigger_id)
                .then((res) => {
                    expect(res).toEqual({ ok: true });
                    done();
                });
        });

        describe('failure', () => {
            it('it catch and log the failure', (done) => {
                expect.assertions(3);
                nock('https://slack.com')
                    .post('/api/dialog.open', /trigger/)
                    .reply(200, { ok: false });

                team.showSupportRequestForm(request_type, trigger_id)
                    .catch((res) => {
                        expect(res).toEqual({ ok: false });
                        expect(loggerSpy).toHaveBeenCalled();
                        const logger_call = loggerSpy.mock.calls[0].toString();
                        expect(logger_call).toEqual(
                            expect.stringContaining('showSupportRequestForm')
                        );
                        done();
                    });
            });
        });
    });
});
