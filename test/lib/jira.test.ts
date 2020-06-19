import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { fixture } from '../helpers';
import { store } from '../../src/util/secrets';

import {
    IssueWithUrl,
    Jira
} from '../../src/lib/jira';

const mock_config = {
    username: 'some name',
    api_token: 'abc-123',
    host: 'http://example.com'
};
const createIssueResponse = fixture('jira/issues.createIssue.response');
const issueWithLink = {
    ...createIssueResponse,
    url: `${mock_config.host}/browse/${createIssueResponse.key}`
} as IssueWithUrl;
const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(({} as unknown) as Logger);
const slack_icon = {
    url16x16: 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png',
    title: 'Slack'
};
jest.spyOn(store, 'jiraConfig').mockReturnValue(mock_config);

const bug_report = {
    id: '1592066203.000100',
    team: {
        id: 'THS7JQ2RL',
        domain: 'supportdemo'
    },
    user: {
        id: 'UHAV00MD0',
        name: 'sherlock_holmes'
    },
    type: 'bug',
    submission: {
        title: 'bug report title'
    },
    channel: 'CHS7JQ7PY'
};
const data_request = {
    id: '1592066203.000200',
    team: {
        id: 'THS7JQ2RL',
        domain: 'supportdemo'
    },
    user: {
        id: 'UHAV00MD1',
        name: 'john_watson'
    },
    type: 'data',
    submission: {
        title: 'data request title'
    },
    channel: 'CHS7JQ7PY'
};

afterEach(() => {
    jest.clearAllMocks();
});

describe('Jira', () => {
    const jira = new Jira('slack-team-random-id');
    const jiraCreateIssueMock = jest.spyOn(jira.client.issues, 'createIssue');
    const createLinkMock = jest.spyOn(
        jira.client.issueRemoteLinks, 'createOrUpdateRemoteIssueLink'
    ).mockReturnValue(Promise.resolve({}));

    describe('#createIssue()', () => {
        it('returns a Promise', () => {
            jiraCreateIssueMock.mockImplementation(() => {
                return Promise.resolve(createIssueResponse);
            });

            expect(jira.createIssue(bug_report)).toBeInstanceOf(Promise);
            const fields = jiraCreateIssueMock.mock.calls[0][0].fields;
            expect(fields.summary).toEqual(bug_report.submission.title);
            expect(fields.issuetype.name).toEqual('Bug');
            expect(fields.project.key).toEqual('SUP');

            expect(jira.createIssue(bug_report))
                .resolves.toEqual(issueWithLink);
        });

        it('links the slack message to created issue', (done) => {
            expect.assertions(1);
            jiraCreateIssueMock.mockImplementation(() => {
                return Promise.resolve(createIssueResponse);
            });

            const id = bug_report.id;
            const team_domain = bug_report.team.domain;
            const channel = bug_report.channel;
            const url = `https://${team_domain}.slack.com/archives/${channel}/p${id}`;
            const title = url;
            const icon = slack_icon;

            const link_params = {
                issueIdOrKey: 'SUP-9',
                object: {
                    url,
                    title,
                    icon
                }
            };

            jira.createIssue(bug_report).then(() => {
                expect(createLinkMock).toHaveBeenCalledWith(link_params);
                done();
            });
        });

        describe('failure', () => {
            it('it catch and log the failure', (done) => {
                expect.assertions(2);
                jiraCreateIssueMock.mockImplementation(() => {
                    return Promise.reject({ ok: false });
                });

                expect(jira.createIssue(bug_report)).rejects.toEqual({ ok: false });

                jira.createIssue(bug_report)
                    .catch(() => {
                        expect(loggerSpy).toHaveBeenCalled();
                        done();
                    });
            });
        });

        describe('data request', () => {
            it('changes issuetype to data', () => {
                jiraCreateIssueMock.mockImplementation(() => {
                    return Promise.resolve(createIssueResponse);
                });

                jira.createIssue(data_request);
                const fields = jiraCreateIssueMock.mock.calls[0][0].fields;
                expect(fields.summary).toEqual(data_request.submission.title);
                expect(fields.issuetype.name).toEqual('Task');
                expect(fields.project.key).toEqual('SUP');
            });
        });
    });
});
