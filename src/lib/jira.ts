import { Client } from 'jira.js';
import { SupportRequest, BugSubmission } from './slack_team';
import logger from '../util/logger';

const slack_icon = {
    url16x16: 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png',
    title: 'Slack'
};

interface Issue {
    [index: string]: string;

    id: string
    key: string,
    self: string
}

interface IssueWithUrl extends Issue {
    url: string
}

const request_type_to_issue_type_name: { [index: string]: string } = {
    bug: 'Bug',
    data: 'Task'
};

class Jira {
    constructor(config: { username: string, api_token: string, host: string }) {
        const client_cfg = {
            host: config.host,
            authentication: {
                basic: {
                    username: config.username,
                    apiToken: config.api_token
                }
            }
        };

        this.host = config.host;
        this.client = new Client(client_cfg);
    }
    host: string;
    client: Client;

    linkRequestToIssue(
        request: SupportRequest,
        issue: Issue
    ): Promise<Record<string, unknown>> {
        const url = request.url;
        const title = request.url;
        const icon = slack_icon;
        const link_params = {
            issueIdOrKey: issue.key,
            object: {
                url,
                title,
                icon
            }
        };

        return this.client.issueRemoteLinks.createOrUpdateRemoteIssueLink(link_params);
    }

    createIssue(request: SupportRequest): Promise<IssueWithUrl> {
        const issue_params = ticketBody(request);

        return this.client.issues.createIssue(issue_params)
            .then((issue: Issue) => {
                const issue_with_url = {
                    ...issue,
                    url: `${this.host}/browse/${issue.key}`
                } as IssueWithUrl;

                return this.linkRequestToIssue(request, issue_with_url)
                    .then(() => {
                        return Promise.resolve(issue_with_url);
                    })
                    .catch((err) => {
                        logger.error('linkRequestToIssue', err);
                        return Promise.resolve(issue_with_url);
                    });
            })
            .catch((err) => {
                logger.error('createIssue', err);
                return Promise.reject({ ok: false });
            });
    }
}

function issueTypeName(request_type: string): string {
    return request_type_to_issue_type_name[request_type];
}

const Descriptions: { [index: string]: (request: SupportRequest) => string } = {
    bug: (request: SupportRequest): string => {
        const submission = request.submission as BugSubmission;
        const slack_user = request.user;

        return `${submission.description}

Currently:
${submission.currently}

Expected:
${submission.expected}

Submitted by: ${slack_user.name}`;
    },
    data: (request: SupportRequest): string => {
        const submission = request.submission;
        const slack_user = request.user;
        return `${submission.description}

Submitted by: ${slack_user.name}`;
    }
};

function ticketBody(request: SupportRequest): Record<string, unknown> {
    const submission = request.submission;
    const issue_type = issueTypeName(request.type);
    const title = submission.title;
    const board = 'SUP';
    const desc = Descriptions[request.type](request);

    return {
        fields: {
            project: { key: board },
            summary: title,
            issuetype: { name: issue_type },
            description: desc,
        },
    };
}

export {
    IssueWithUrl,
    Jira
};
