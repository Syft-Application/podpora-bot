import { JIRA_API_TOKEN, JIRA_HOST, JIRA_USERNAME } from './../util/secrets';
import { Client } from 'jira.js';
import logger from '../util/logger';

const cfg = {
    host: JIRA_HOST,
    authentication: {
        basic: {
            username: JIRA_USERNAME,
            apiToken: JIRA_API_TOKEN
        }
    }
};

const client = new Client(cfg);

const slack_icon = {
    url16x16: 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png',
    title: 'Slack'
};

interface SupportRequest {
    id: string
    team: {
        id: string,
        domain: string
    },
    user: {
        id: string,
        name: string
    },
    type: string
    submission: {
        title: string
    },
    channel: string
}

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
    task: 'Task',
    data: 'Task'
};

// function boardKey(request_type: string): string {
//     return 'SUP';
// }

function issueTypeName(request_type: string): string {
    return request_type_to_issue_type_name[request_type];
}

function ticketBody(request: SupportRequest): Record<string, unknown> {
    const submission = request.submission;
    const issue_type = issueTypeName(request.type);
    const title = submission.title;
    const board = 'SUP';
    const desc = 'This is description';

    return {
        fields: {
            project: { key: board },
            summary: title,
            issuetype: { name: issue_type },
            description: desc,
        },
    };
}

function linkRequestToIssue(
    request: SupportRequest,
    issue: Issue
): Promise<Record<string, unknown>> {
    const id = request.id;
    const team_domain = request.team.domain;
    const channel = request.channel;
    const url = `https://${team_domain}.slack.com/archives/${channel}/p${id}`;
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

    return client.issueRemoteLinks.createOrUpdateRemoteIssueLink(link_params);
}

function createIssue(request: SupportRequest): Promise<IssueWithUrl> {
    const issue_params = ticketBody(request);

    return client.issues.createIssue(issue_params)
        .then((issue: Issue) => {
            // TODO: remove hardcoded subdomain
            const issue_with_url = {
                ...issue,
                url: `https://podpora-bot.atlassian.net/browse/${issue.key}`
            } as IssueWithUrl;

            return linkRequestToIssue(request, issue_with_url)
                .then(() => {
                    return Promise.resolve(issue_with_url);
                });
        })
        .catch((err) => {
            logger.error(err);

            return Promise.reject({ ok: false });
        });
}

export {
    createIssue,
    IssueWithUrl,
    client
};
