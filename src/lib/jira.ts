import { Client } from 'jira.js';
import logger from '../util/logger';
import {
    Issue
} from './jira/api_interfaces';

const slack_icon = {
    url16x16: 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png',
    title: 'Slack'
};

interface IssueParams {
    [index: string]: Record<string, unknown>;

    fields: {
        project: { key: string },
        summary: string,
        issuetype: { name: string },
        description: string,
    }
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

    addSlackThreadUrlToIssue(
        url: string,
        issue: Issue
    ): Promise<Record<string, unknown>> {
        // TODO: extract out
        const title = url;
        const icon = slack_icon;

        const link_params = {
            issueIdOrKey: issue.key,
            object: {
                url,
                title,
                icon
            }
        };

        return this.client.issueRemoteLinks.createOrUpdateRemoteIssueLink(link_params)
            .catch((err) => {
                logger.error('addSlackThreadUrlToIssue', err);
                return Promise.reject({ ok: false });
            });
    }

    createIssue(issue_params: IssueParams): Promise<Issue> {
        return this.client.issues.createIssue(issue_params)
            .catch((err) => {
                logger.error('createIssue', err);
                return Promise.reject({ ok: false });
            });
    }

    issueUrl(issue: Issue): string {
        return `${this.host}/browse/${issue.key}`;
    }

    addComment(issue_key: string, comment: string): Promise<unknown> {
        return this.client.issueComments.addComment({
            issueIdOrKey: issue_key,
            body: comment
        }).catch((err) => {
            logger.error('addComment', err);
            // TODO reject?
            return Promise.resolve({ ok: false });
        });
    }

    toKey(issue: Issue): string {
        return [this.host, issue.id].join(',');
    }

    find(id: number): Promise<Issue> {
        const issue_params = { issueIdOrKey: `${id}` };

        return this.client.issue.getIssue(issue_params)
            .catch((err) => {
                logger.error('find', id, err);
                return Promise.reject({ ok: false });
            });
    }
}

export {
    Issue,
    IssueParams,
    Jira
};
