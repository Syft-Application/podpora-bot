import { Dialog } from '@slack/web-api';
import { Slack } from './slack';
import { SlackUser } from './slack/api_interfaces';

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

const configs: { [index: string]: SupportRequestConfig } = {};

configs.default = {
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
        let issue_type: string;
        let title: string;
        let board: string;
        let desc: string;

        if (request_type === 'bug') {
            issue_type = 'Bug';
            title = submission.title;
            board = 'SUP';
            desc = `${submission.description}

Currently:
${submission.currently}

Expected:
${submission.expected}

Submitted by: ${slack_user.name}`;

        } else {
            issue_type = 'Task';
            title = submission.title;
            board = 'SUP';
            desc = `${submission.description}

Submitted by: ${slack_user.name}`;
        }

        return {
            fields: {
                project: { key: board },
                summary: title,
                issuetype: { name: issue_type },
                description: desc,
            }
        };
    },
    supportMessageText(
        submission: Submission,
        user: SlackUser,
        request_type: string
    ): string {
        if (request_type === 'bug') {
            return `<@${user.id}> has submitted a bug report:\n\n` +
                `*${submission.title}*\n\n` +
                `*Steps to Reproduce*\n\n${submission.description}\n\n` +
                `*Currently*\n\n${submission.currently}\n\n` +
                `*Expected*\n\n${submission.expected}`;
        } else {
            return `<@${user.id}> has submitted a data request:\n\n` +
                `*${submission.title}*\n\n${submission.description}`;
        }
    }
};

configs.default.templates.bug = {
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
configs.default.templates.data = {
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

function config(slack: Slack): SupportRequestConfig {
    return configs[slack.supportConfigName()];
}

export {
    config
};
