import { Client } from 'jira.js';
import { SupportRequest } from './slack_team';
import logger from '../util/logger';
import create_issue_params from './jira_create_issue_params';

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
        const issue_params = create_issue_params[request.type](request);

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

export {
    IssueWithUrl,
    Issue,
    Jira
};
