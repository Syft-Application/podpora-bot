import fs from 'fs';
import path from 'path';
import { Dialog, View } from '@slack/web-api';
import {
    SlackUser,
    Submission,
    ViewSubmission
} from './slack/api_interfaces';
import {
    viewInputVals
} from './slack_jira_helpers';

interface IssueParams {
    [index: string]: Record<string, unknown>;

    fields: {
        project: { key: string },
        summary: string,
        issuetype: { name: string },
        description: string,
        labels: Array<string>
    }
}

interface Dialogs {
    [index: string]: Dialog
}

interface Views {
    [index: string]: View
}

interface SlackCommand {
    name: string,
    desc: string,
    example: string
}

interface SupportConfig {
    commands: Array<SlackCommand>,
    commandsHelpText: () => string,
    dialogs: Dialogs,
    view: (key: string) => View,
    viewToSubmission: (
        view: ViewSubmission['view'],
        request_type: string
    ) => Submission,
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

const viewsDirectoryPath = path.join(__dirname, '..', 'views', 'support', 'default');
const views: Views = {};
fs.readdirSync(viewsDirectoryPath).reduce((acc, name: string) => {
    const fpath = path.join(viewsDirectoryPath, name);
    acc[path.parse(fpath).name] = JSON.parse(
        fs.readFileSync(fpath).toString()
    );
    return acc;
}, views);

function commandsHelpText(commands: Array<SlackCommand>): string {
    return '👋 Need help with support bot?\n\n' + commands.map(
        (cmd) => {
            return `> ${cmd.desc}:\n>\`${cmd.example}\``;
        }).join('\n\n');
}

function viewToSubmission(
    view: ViewSubmission['view'],
    request_type: string
): Submission {
    const values = view.state.values;
    const submission: Submission = {};
    if (request_type === 'bug') {
        submission.title = viewInputVals('sl_title', values);
        submission.description = viewInputVals('ml_description', values);
        submission.currently = viewInputVals('sl_currently', values);
        submission.expected = viewInputVals('sl_expected', values);
    } else {
        submission.title = viewInputVals('sl_title', values);
        submission.description = viewInputVals('ml_description', values);
    }

    return submission;
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
    commandsHelpText: function(): string {
        return commandsHelpText(this.commands);
    },
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
    view: function(key: string): View {
        return views[key];
    },
    viewToSubmission: viewToSubmission,
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
                labels: ['support']
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
        }
    ],
    commandsHelpText: function(): string {
        return commandsHelpText(this.commands);
    },
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
    view: function(key: string): View {
        return configs.default.view(key);
    },
    viewToSubmission: viewToSubmission,
    issueParams: function(
        submission: Submission,
        user: SlackUser,
        request_type: string,
    ): IssueParams {
        const title: string = submission.title;
        let board: string;
        let issue_type: string;
        let desc: string;

        if (request_type === 'bug') {
            board = 'SUP';
            issue_type = 'Bug';
            desc = `${submission.description}

Currently:
${submission.currently}

Expected:
${submission.expected}

Submitted by: ${user.name}`;

        } else {
            board = 'SUP';
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
                labels: ['support']
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
