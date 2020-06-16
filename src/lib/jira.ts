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

// function linkSlackSupportRequestToIssue(
//     support_request: Record<string, string>,
//     issue: Record<string, string>
// ): void {
//     logger.debug(team);
//     logger.debug(slack_message);
//     logger.debug(jira_response);
// }


interface SupportRequest {
    // [index: string]: string;

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
    }
}

function ticketBody(request: SupportRequest): Record<string, unknown> {
    const submission = request.submission;
    const issue_type = request.type;
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

// TODO: remove eslint-disable
/* eslint-disable @typescript-eslint/no-explicit-any */
function createIssue(request: SupportRequest): Promise<any> {
    // TODO: implementation
    const ticket = ticketBody(request);

    return client.issues.createIssue(ticket)
        .catch((err) => {
            logger.error(err);

            return Promise.reject({ ok: false });
        });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export {
    createIssue,
    client
};

// let issue_params = {
//     fields: {
//         pid: 10000,
//         issuetype: 10004,
//         summary: 'this ssparta',
//         description: 'black lives matter'
//     }
// }

// Promise { { id: '10005', key: 'SUP-6',
// self: 'https://podpora-bot.atlassian.net/rest/api/2/issue/10005' } }
// let description = "this is \n multiline \n *description*"
// let desc = `Submitted by: joe doe\n\n${description}\n`
// let params8 = {
//     fields: {
//         project: { key: 'SUP' },
//         summary: 'bug summary',
//         description: desc,
//         issuetype: { name: 'Bug' },
//     }
// }
// prom.then((val) => {
//     let v = JSON.stringify(val, undefined, 2);
//     console.log(v);
// }, (err) => {
//     console.log('-t- err');
//     console.log(err);
// });
