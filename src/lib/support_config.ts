import { Dialog } from '@slack/web-api';
import { SlackUser, Submission } from './slack/api_interfaces';

interface IssueParams {
    [index: string]: Record<string, unknown>;

    fields: {
        project: { key: string },
        summary: string,
        issuetype: { name: string },
        description: string,
    }
}

interface Dialogs {
    [index: string]: Dialog
}

interface SlackSupportCommand {
    name: string,
    desc: string,
    example: string
}

interface SupportConfig {
    commands: Array<SlackSupportCommand>,
    dialogs: Dialogs,
    issueParams: (
        submission: Submission,
        user: SlackUser,
        request_type: string
    ) => IssueParams,
    supportMessageText: (
        submission: Submission,
        user: SlackUser,
        request_type: string
    ) => string
}

const configs: { [index: string]: SupportConfig } = {};

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
    dialogs: {
        bug: {
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
                    placeholder: 'Bullet point steps to reproduce. ' +
                        'Include specifics, eg. urls and ids',
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
        },
        data: {
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
        }
    },
    issueParams: function(
        submission: Submission,
        user: SlackUser,
        request_type: string,
    ): IssueParams {
        const title: string = submission.title;
        const board = 'SUP';
        let issue_type: string;
        let desc: string;

        if (request_type === 'bug') {
            issue_type = 'Bug';
            desc = `${submission.description}

Currently:
${submission.currently}

Expected:
${submission.expected}

Submitted by: ${user.name}`;

        } else {
            issue_type = 'Task';
            desc = `${submission.description}

Submitted by: ${user.name}`;
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


configs.syft = {
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
        },
        {
            name: 'idea',
            desc: 'Submit a product idea',
            example: '/support idea'
        }
    ],
    dialogs: {
        bug: {
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
                    placeholder: 'Bullet point steps to reproduce. ' +
                        'Include specifics, eg. urls and ids',
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
        },
        data: {
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
        },
        idea: {
            callback_id: '',
            title: 'New Product Idea',
            submit_label: 'Submit',
            state: 'support_idea',
            elements: [
                {
                    type: 'text',
                    name: 'title',
                    label: 'Title',
                    placeholder: 'eg. Portal: Filter of happy workers for employer.',
                    value: '',
                },
                {
                    type: 'textarea',
                    label: 'Description',
                    placeholder: 'Please describe your idea or feature, eg. benefits, impact..',
                    name: 'description',
                    value: '',
                },
            ]
        }
    },
    issueParams: function(
        submission: Submission,
        user: SlackUser,
        request_type: string,
    ): IssueParams {
        const title: string = submission.title;
        const board = 'SUP';
        let issue_type: string;
        let desc: string;

        if (request_type === 'bug') {
            issue_type = 'Bug';
            desc = `${submission.description}

Currently:
${submission.currently}

Expected:
${submission.expected}

Submitted by: ${user.name}`;

        } else if (request_type === 'idea') {
            issue_type = 'Product Idea';
            desc = `${submission.description}

Submitted by: ${user.name}`;
        } else {
            issue_type = 'Data Request';
            desc = `${submission.description}

Submitted by: ${user.name}`;
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
        return configs.default.supportMessageText(submission, user, request_type);
    }
};

export default function supportConfig(key: string): SupportConfig {
    return configs[key];
}
