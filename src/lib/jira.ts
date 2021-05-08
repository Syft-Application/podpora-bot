import {
    Version3Client
} from 'jira.js';
import {
    IssueBean,
    Issue
} from 'jira.js/out/version3/models'
import logger from '../util/logger';
import {
    IssueParams
} from './jira/api_interfaces';

const slack_icon = {
    url16x16: 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png',
    title: 'Slack'
};

class Jira {
    constructor(config: { username: string, api_token: string, host: string }) {
        const client_cfg = {
            telemetry: false,
            host: config.host,
            authentication: {
                basic: {
                    email: config.username,
                    apiToken: config.api_token
                }
            }
        };

        this.host = config.host;
        this.client = new Version3Client(client_cfg);
    }
    host: string;
    client: Version3Client;

    // addSlackThreadUrlToIssue(
    //     url: string,
    //     issue: Issue
    // ): Promise<{ ok: boolean }> {
    //     // TODO: extract out
    //     const title = url;
    //     const icon = slack_icon;

    //     const link_params = {
    //         issueIdOrKey: issue.key,
    //         object: {
    //             url,
    //             title,
    //             icon
    //         }
    //     };

    //     return this.client.issueRemoteLinks.createOrUpdateRemoteIssueLink(link_params)
    //         .then((res) => {
    //             return Promise.resolve({
    //                 ok: true
    //             })
    //         }).catch((err) => {
    //             logger.error('addSlackThreadUrlToIssue', err);
    //             return Promise.reject({ ok: false });
    //         });
    // }

    createIssue(issue_params: IssueParams): Promise<Issue> {
        return this.client.issues.createIssue(issue_params)
            .catch((err) => {
                logger.error('createIssue', err);
                return Promise.reject({ ok: false });
            });
    }

    // issueUrl(issue: { key: string }): string {
    //     return `${this.host}/browse/${issue.key}`;
    // }

    // addComment(issue_key: string, comment: string): Promise<unknown> {
    //     return this.client.issueComments.addComment({
    //         issueIdOrKey: issue_key,
    //         body: comment
    //     }).catch((err) => {
    //         logger.error('addComment', err);
    //         // TODO reject?
    //         return Promise.resolve({ ok: false });
    //     });
    // }

    // toKey(issue: Issue): string {
    //     return [this.host, issue.id].join(',');
    // }

    // find(id: number): Promise<Issue | IssueBean> {
    //     const issue_params = { issueIdOrKey: `${id}` };

    //     return this.client.issues.getIssue(issue_params)
    //         .catch((err) => {
    //             logger.error('find', id, err);
    //             return Promise.reject({ ok: false });
    //         });
    // }
}

export {
    Jira
};
