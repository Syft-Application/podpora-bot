import nock from 'nock';
import { fixture } from '../helpers';
import logger from '../../src/util/logger';
import {
    IssueWithUrl,
    Jira
} from '../../src/lib/jira';

const createIssueResponse = fixture('jira/issues.createIssue.response');

const bug_report = {
    id: '1592066203.000100',
    team_id: 'THS7JQ2RL',
    user: {
        id: 'UHAV00MD0',
        name: 'sherlock_holmes'
    },
    type: 'bug',
    submission: {
        title: 'bug report title',
        description: 'bug report description',
        expected: 'we like this to happen',
        currently: 'this is what happens now'
    },
    url: 'http://example.com/bug',
    channel: 'CHS7JQ7PY'
};
const data_request = {
    id: '1592066203.000200',
    team_id: 'THS7JQ2RL',
    user: {
        id: 'UHAV00MD1',
        name: 'john_watson'
    },
    type: 'data',
    submission: {
        title: 'data request title',
        description: 'data request description'
    },
    url: 'http://example.com/data',
    channel: 'CHS7JQ7PY'
};

beforeAll(() => {
    return nock.disableNetConnect();
});

afterAll(() => {
    return nock.enableNetConnect();
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('Jira', () => {
    const mock_config = {
        username: 'some name',
        api_token: 'abc-123',
        host: 'http://example.com'
    };
    const issueWithUrl = {
        ...createIssueResponse,
        url: `${mock_config.host}/browse/${createIssueResponse.key}`
    } as IssueWithUrl;

    const jira = new Jira(mock_config);

    describe('#createIssue()', () => {
        it('returns a Promise to create issue and link it to the slack thread', (done) => {
            let api_call_body: string;
            expect.assertions(7);
            nock(mock_config.host)
                .post('/rest/api/2/issue', (body) => {
                    api_call_body = JSON.stringify(body);
                    return body;
                }).reply(200, createIssueResponse);

            nock(mock_config.host)
                .post(`/rest/api/2/issue/${createIssueResponse.key}/remotelink`)
                .reply(200);

            jira.createIssue(bug_report)
                .then((res) => {
                    const submission = bug_report.submission;
                    expect(res).toEqual(issueWithUrl);
                    expect(api_call_body).toContain(submission.title);
                    expect(api_call_body).toContain(submission.description);
                    expect(api_call_body).toContain(submission.expected);
                    expect(api_call_body).toContain(submission.currently);
                    expect(api_call_body).toContain(bug_report.user.name);
                    expect(api_call_body).toContain('Bug');
                    done();
                }).catch(done);
        });

        describe('API failure', () => {
            it('it catch and log the failure', (done) => {
                const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(null);
                expect.assertions(3);

                nock(mock_config.host)
                    .post('/rest/api/2/issue', new RegExp('title'))
                    .reply(500, createIssueResponse);

                jira.createIssue(bug_report)
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

        describe('link slack message to an issue fails', () => {
            it('it catch and log the failure but resolves successfuly', (done) => {
                const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(null);

                expect.assertions(3);
                nock(mock_config.host)
                    .post('/rest/api/2/issue')
                    .reply(200, createIssueResponse);

                nock(mock_config.host)
                    .post(
                        `/rest/api/2/issue/${createIssueResponse.key}/remotelink`
                    ).reply(503, {});

                jira.createIssue(bug_report)
                    .then((res) => {
                        expect(loggerSpy).toHaveBeenCalled();
                        const logger_call = loggerSpy.mock.calls[0].toString();
                        expect(logger_call).toEqual(
                            expect.stringContaining('linkRequestToIssue')
                        );
                        expect(res).toEqual(issueWithUrl);
                        done();
                    });
            });
        });

        describe('data request', () => {
            it('changes issuetype to data', (done) => {
                let api_call_body: string;
                expect.assertions(5);
                nock(mock_config.host)
                    .post('/rest/api/2/issue', (body) => {
                        api_call_body = JSON.stringify(body);
                        return body;
                    }).reply(200, createIssueResponse);

                nock(mock_config.host)
                    .post(`/rest/api/2/issue/${createIssueResponse.key}/remotelink`)
                    .reply(200);

                jira.createIssue(data_request)
                    .then((res) => {
                        const submission = data_request.submission;
                        expect(res).toEqual(issueWithUrl);
                        expect(api_call_body).toContain(submission.title);
                        expect(api_call_body).toContain(submission.description);
                        expect(api_call_body).toContain(data_request.user.name);
                        expect(api_call_body).toContain('Task');
                        done();
                    }).catch(done);
            });
        });
    });
});
