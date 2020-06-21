import { SupportRequest, BugSubmission } from './slack_team';

interface IssueParams {
    [index: string]: Record<string, unknown>;

    fields: {
        project: { key: string },
        summary: string,
        issuetype: { name: string },
        description: string,
    }
}

const create_issue_params: {
    [index: string]: (request: SupportRequest) => IssueParams
} = {
    bug: (request: SupportRequest): IssueParams => {
        const submission = request.submission as BugSubmission;
        const slack_user = request.user;
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
    },
    data: (request: SupportRequest): IssueParams => {
        const submission = request.submission;
        const slack_user = request.user;
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

};

export default create_issue_params;
