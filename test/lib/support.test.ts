import nock from 'nock';
import { Logger } from 'winston';
import { fixture } from '../helpers';
import logger from '../../src/util/logger';
import { store } from '../../src/util/secrets';
import {
    SlackMessage,
    Slack
} from '../../src/lib/slack';
import {
    Jira
} from '../../src/lib/jira';

import {
    fileShareEventToIssueComment,
    support
} from '../../src/lib/support';
import {
    ChannelThreadFileShareEvent,
} from '../../src/lib/slack/api_interfaces';

const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);

afterEach(() => {
    jest.clearAllMocks();
});

const slack_options = store.slackOptions('T0001');
const slack = new Slack(slack_options);
const postMsgResponse = fixture('slack/chat.postMessage.response');
const slack_message = postMsgResponse as SlackMessage;

describe('#postIssueUrlOnThread(url, )', () => {
    const url = 'https://example.atlassian.net/issue/10008';
    it('returns a Promise that resolves to SupportRequest', (done) => {
        expect.assertions(1);
        nock('https://slack.com')
            .post('/api/chat.postMessage')
            .reply(200, { ok: true });

        support.postIssueUrlOnThread(slack, url, slack_message)
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

            support.postIssueUrlOnThread(slack, url, slack_message)
                .catch((error) => {
                    expect(error.message).toContain('postIssueUrlOnThread');
                    expect(logErrorSpy).toHaveBeenCalled();
                    const logger_call = logErrorSpy.mock.calls[0].toString();
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

            support.showForm(slack, 'bug', 'abc')
                .catch(() => {
                    expect(logErrorSpy).toHaveBeenCalled();
                    const logger_call = logErrorSpy.mock.calls[0].toString();

                    expect(logger_call).toEqual(
                        expect.stringContaining('showForm')
                    );
                    done();
                });
        });
    });
});

describe('#fileShareEventToIssueComment(event, url, user_name)', () => {
    const bin_file = {
        id: 'F015XSUL1K4',
        name: 'puzzle.org',
        title: 'puzzle.org',
        mimetype: 'text/plain',
        filetype: 'text',
        pretty_type: 'Plain Text',
        url_private: 'https://files.slack.com/files-pri/THS7JQ2RL-F015XSUL1K4/puzzle.org',
        url_private_download: 'https://files.slack.com/fi/download/puzzle.org',
        permalink: 'https://test.slack.com/files/UHAV00MD0/F015XSUL1K4/puzzle.org',
        permalink_public: 'https://slack-files.com/THS7JQ2RL-F015XSUL1K4-b0d770cfec'
    };

    const img_file = {
        id: 'F015N0DGC87',
        name: 'Cover.jpg',
        title: 'Cover.jpg',
        mimetype: 'image/jpeg',
        filetype: 'jpg',
        pretty_type: 'JPEG',
        user: 'UHAV00MD0',
        url_private: 'https://files.slack.com/files-pri/T0001-F015N0DGC87/cover.jpg',
        url_private_download: 'https://files.slack.com/fi15N0DGC87/download/cover.jpg',
        thumb_360: 'https://files.slack.com/files-tmb/T00C87-428249289d/cover_360.jpg',
        thumb_160: 'https://files.slack.com/files-tmb/T00GC87-428249289d/cover_160.jpg',
        original_w: 250,
        original_h: 250,
        permalink: 'https://test.slack.com/files/UHAF015N0DGC87/cover.jpg',
        permalink_public: 'https://slack-files.com/T0001-F015N0DGC87-bcd4f0fe25',
    };

    const event = {
        type: 'message',
        text: 'some message',
        files: [bin_file, img_file],
        user: 'UHAV00MD0',
        ts: '1593117566.000400',
        thread_ts: '1593117373.000100',
        channel: 'CHS7JQ7PY',
        subtype: 'file_share'
    };

    const result = fileShareEventToIssueComment(event, 'some url', 'Egon Bondy');

    it('contains the text message and link to slack', () => {
        expect(result).toContain('some message');
        expect(result).toContain('some url');
    });

    it('contains user name', () => {
        expect(result).toContain('Egon Bondy');
    });

    describe('files: [bin_file]', () => {
        it('contains file download link', () => {
            expect(result).toContain(bin_file.url_private_download);
        });
    });

    describe('files: [image]', () => {
        it('contains also image thumb (preview) url', () => {
            expect(result).toContain(img_file.thumb_360);
            expect(result).toContain(img_file.url_private);
            expect(result).toContain(img_file.url_private_download);
        });
    });
});

describe('#addFileToJiraIssue(slack, jira, event)', () => {
    const event = fixture('slack/events.message_with_file').event as ChannelThreadFileShareEvent;
    const jira = new Jira(store.jiraOptions('T0001'));
    const storeGetSpy = jest.spyOn(store, 'get');

    describe('when fetching user name fail', () => {
        it('add message as comment to Jira Issue with user id', (done) => {
            expect.assertions(1);
            const issue_key = 'foo-issue-key';
            const checkJiraComment = (body: string) => {
                expect(body).toContain('UHAV00MD0');

                done();
            };

            nock('https://example.com')
                .post(`/rest/api/2/issue/${issue_key}/comment`, (body) => {
                    checkJiraComment(JSON.stringify(body));
                    return body;
                }).reply(200);

            nock('https://slack.com')
                .post('/api/users.info')
                .reply(200, { ok: false, error: 'something wrong' });

            storeGetSpy.mockImplementationOnce(() => {
                return Promise.resolve(issue_key);
            });
            support.addFileToJiraIssue(slack, jira, event);
        });
    });


    describe('when issue key not found db', () => {
        it('logs the error', (done) => {
            expect.assertions(2);

            storeGetSpy.mockImplementationOnce(() => {
                return Promise.resolve(null);
            });

            logErrorSpy.mockImplementationOnce((msg) => {
                expect(msg).toContain('addFileToJiraIssue');
                expect(msg.toString()).toContain('Issue key not found');
                done();
                return {} as Logger;
            });

            support.addFileToJiraIssue(slack, jira, event);
        });
    });
});
