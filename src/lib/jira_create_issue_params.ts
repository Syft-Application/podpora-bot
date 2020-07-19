import {
    SlackUser
} from './slack_team';

import { Submission } from './support';

interface IssueParams {
    [index: string]: Record<string, unknown>;

    fields: {
        project: { key: string },
        summary: string,
        issuetype: { name: string },
        description: string,
    }
}

interface BugSubmission {
    title: string,
    description: string
    currently: string,
    expected: string
}

interface DataSubmission {
    title: string,
    description: string
}

function bugToIssueParams(submission: BugSubmission, slack_user: SlackUser): IssueParams {
    const issue_type = 'Bug';
    const title = submission.title;
    const board = 'SUP';
    const desc = `${submission.description}

Currently:
${submission.currently}

Expected:
${submission.expected}

Submitted by: ${slack_user.name}`;

    return {
        fields: {
            project: { key: board },
            summary: title,
            issuetype: { name: issue_type },
            description: desc,
        }
    };
}

function dataToIssueParams(submission: DataSubmission, slack_user: SlackUser): IssueParams {
    const issue_type = 'Task';
    const title = submission.title;
    const board = 'SUP';
    const desc = `${submission.description}

Submitted by: ${slack_user.name}`;

    return {
        fields: {
            project: { key: board },
            summary: title,
            issuetype: { name: issue_type },
            description: desc,
        }
    };
}

function issueParams(
    submission: Submission,
    slack_user: SlackUser,
    request_type: string,
): IssueParams {
    if (request_type === 'bug') {
        return bugToIssueParams(submission as unknown as BugSubmission, slack_user);
    } else {
        return dataToIssueParams(submission as unknown as DataSubmission, slack_user);
    }
}

export default issueParams;
