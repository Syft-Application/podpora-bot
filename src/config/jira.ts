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

const jiraClient = new Client(cfg);

function ticketBody(message: Record<string, unknown>): Record<string, unknown> {
    const issue_type = 'Bug';
    const title = 'fooo bar baz';
    const board = 'SUP';
    const desc = 'This is description';

    logger.debug(message);
    return {
        fields: {
            summary: title,
            issuetype: {
                name: issue_type,
            },
            project: {
                key: board,
            },
            description: {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                text: desc,
                                type: 'text',
                            },
                        ],
                    },
                ],
            },
        },
    };
}

// TODO: remove eslint-disable
/* eslint-disable @typescript-eslint/no-explicit-any */
function createIssueFromSlackMessage(message: Record<string, unknown>): Promise<any> {
    // TODO: implementation
    const ticket = ticketBody(message);

    return jiraClient.issues.createIssue(ticket)
        .catch((err) => {
            logger.error(err);
        });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export {
    createIssueFromSlackMessage
};
