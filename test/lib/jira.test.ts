import nock from 'nock';
import { Logger } from 'winston';
import { fixture } from '../helpers';
import logger from '../../src/util/logger';
import {
    Jira,
    Issue
} from '../../src/lib/jira';
import { support_requests } from '../../src/lib/support_requests';
const logErrorSpy = jest.spyOn(logger, 'error').mockReturnValue({} as Logger);

const createIssueResponse = fixture('jira/issues.createIssue.response');

const bug_report = {
    id: '1592066203.000100',
    team_id: 'THS7JQ2RL',
    user: {
        id: 'UHAV00MD0',
        name: 'sherlock_holmes'
    },
    submission: {
        title: 'bug report title',
        description: 'bug report description',
        expected: 'we like this to happen',
        currently: 'this is what happens now',
    },
    url: 'http://example.com/bug',
    channel: 'CHS7JQ7PY',
    state: 'bug'
};

afterEach(() => {
    jest.clearAllMocks();
});

describe('Jira', () => {
    const mock_config = {
        username: 'some name',
        api_token: 'abc-123',
        host: 'http://example.com'
    };

    const jira = new Jira(mock_config);

    const issue = createIssueResponse as Issue;
    describe('#createIssue(params)', () => {
        const submission = bug_report.submission;
        const user = bug_report.user;
        const request_type = 'bug';
        const params = support_requests.default.issueParams(submission, user, request_type);
        it('returns a Promise that resolves to issue object', (done) => {
            let api_call_body: string;
            expect.assertions(7);
            nock(mock_config.host)
                .post('/rest/api/2/issue', (body) => {
                    api_call_body = JSON.stringify(body);
                    return body;
                }).reply(200, createIssueResponse);

            jira.createIssue(params)
                .then((res) => {
                    const submission = bug_report.submission;
                    expect(res).toEqual(issue);
                    expect(api_call_body).toContain(submission.title);
                    expect(api_call_body).toContain(submission.description);
                    expect(api_call_body).toContain(submission.expected);
                    expect(api_call_body).toContain(submission.currently);
                    expect(api_call_body).toContain(user.name);
                    expect(api_call_body).toContain('Bug');
                    done();
                }).catch(done);
        });

        describe('API failure', () => {
            it('it catch and log the failure', (done) => {
                const loggerSpy = jest.spyOn(logger, 'error')
                    .mockReturnValue({} as Logger);
                expect.assertions(3);

                nock(mock_config.host)
                    .post('/rest/api/2/issue')
                    .reply(403, { ok: false });

                jira.createIssue(params)
                    .catch((res) => {
                        expect(loggerSpy).toHaveBeenCalled();
                        const logger_call = loggerSpy.mock.calls[0].toString();
                        expect(logger_call).toEqual(
                            expect.stringContaining('createIssue')
                        );
                        expect(res).toEqual({ ok: false });
                        done();
                    });
            });
        });
    });

    describe('#addSlackThreadUrlToIssue(url, issue)', () => {
        const url = 'some random url';

        it('returns promise', (done) => {
            nock(mock_config.host)
                .post(
                    `/rest/api/2/issue/${issue.key}/remotelink`
                ).reply(200, { foo: 123 });

            jira.addSlackThreadUrlToIssue(url, issue)
                .then((res) => {
                    expect(res).toEqual({ foo: 123 });
                    done();
                });
        });

        describe('api failure', () => {
            it('returns promise that rejects', (done) => {
                nock(mock_config.host)
                    .post(
                        `/rest/api/2/issue/${issue.key}/remotelink`
                    ).reply(403, { ok: false });

                jira.addSlackThreadUrlToIssue(url, issue)
                    .catch((res) => {
                        expect(res).toEqual({ ok: false });
                        expect(logErrorSpy).toHaveBeenCalled();
                        done();
                    });
            });
        });
    });

    describe('#issueUrl', () => {
        it('returns url to jira issue on host domain', () => {
            const issue = createIssueResponse as Issue;
            const url = jira.issueUrl(issue);

            expect(url).toEqual(`${mock_config.host}/browse/${issue.key}`);
        });
    });

    describe('#addComment', () => {
        it('logs the error', (done) => {
            nock('https://example.com')
                .post('/rest/api/2/issue/issue-key/comment')
                .reply(404);


            jira.addComment('issue-key', 'comment')
                .then((res) => {
                    expect(res).toEqual({ ok: false });
                    expect(logErrorSpy).toHaveBeenCalled();
                    const logger_call = logErrorSpy.mock.calls[0].toString();
                    expect(logger_call).toContain('issue-key');
                    expect(logger_call).toContain('addComment');

                    done();
                });
        });
    });
});
