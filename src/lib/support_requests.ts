import { Dialog } from '@slack/web-api';

interface SlackUser { id: string, name: string }

interface Submission {
    [index: string]: string;
}

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

function bugReportMessageText(
    submission: BugSubmission,
    user: SlackUser
): string {
    return `<@${user.id}> has submitted a bug report:\n\n` +
        `*${submission.title}*\n\n` +
        `*Steps to Reproduce*\n\n${submission.description}\n\n` +
        `*Currently*\n\n${submission.currently}\n\n` +
        `*Expected*\n\n${submission.expected}`;
}

function dataRequestMessageText(
    submission: DataSubmission,
    user: SlackUser
): string {
    return `<@${user.id}> has submitted a data request:\n\n` +
        `*${submission.title}*\n\n${submission.description}`;
}

interface Templates {
    [index: string]: Dialog
}

interface SlackSupportCommand {
    name: string,
    desc: string,
    example: string
}

interface SupportRequestConfig {
    commands: Array<SlackSupportCommand>,
    templates: Templates,
    issueParams: (
        submission: Submission,
        slack_user: SlackUser,
        request_type: string
    ) => IssueParams,
    supportMessageText: (
        submission: Submission,
        user: SlackUser,
        request_type: string
    ) => string
}

const support_requests: { [index: string]: SupportRequestConfig } = {};
support_requests.default = {
    commands: [
        {
            name: 'data',
            desc: 'Submit a request for data',
            example: '/support data'
        },
        {
            name: 'bug',
            desc: 'Submit a bug report',
            example: '/support bug'
        }
    ],
    templates: {},
    issueParams: function(
        submission: Submission,
        slack_user: SlackUser,
        request_type: string,
    ): IssueParams {
        if (request_type === 'bug') {
            return bugToIssueParams(submission as unknown as BugSubmission, slack_user);
        } else {
            return dataToIssueParams(submission as unknown as DataSubmission, slack_user);
        }
    },
    supportMessageText(
        submission: Submission,
        user: SlackUser,
        request_type: string
    ): string {
        if (request_type === 'bug') {
            return bugReportMessageText(submission as unknown as BugSubmission, user);
        } else {
            return dataRequestMessageText(submission as unknown as DataSubmission, user);
        }
    }
};

support_requests.default.templates.bug = {
    callback_id: '',
    title: 'Report Bug',
    submit_label: 'Submit',
    state: 'support_bug',
    elements: [
        {
            type: 'text',
            label: 'Title',
            placeholder: 'eg. Employer 1234 can\'t see shifts',
            name: 'title',
            value: '',
        },
        {
            type: 'textarea',
            label: 'Steps to Reproduce',
            placeholder: 'Bullet point steps to reproduce. Include specifics, eg. urls and ids',
            name: 'description',
            value: '',
        },
        {
            type: 'text',
            label: 'Current Outcome',
            placeholder: 'What *currently* happens when the above steps are taken?',
            name: 'currently',
            value: '',
        },
        {
            type: 'text',
            label: 'Expected Outcome',
            placeholder: 'What *should* happen when the above steps are taken?',
            name: 'expected',
            value: '',
        },
    ]
};
support_requests.default.templates.data = {
    callback_id: '',
    title: 'New Data Request',
    submit_label: 'Submit',
    state: 'support_data',
    elements: [
        {
            type: 'text',
            name: 'title',
            label: 'Title',
            placeholder: 'eg. Number of shifts per employer in Feb 2019',
            value: '',
        },
        {
            type: 'textarea',
            label: 'Description',
            placeholder: 'Please include any extra information required, eg. column names',
            name: 'description',
            value: '',
        },
    ]
};

export {
    Submission,
    IssueParams,
    support_requests
};
