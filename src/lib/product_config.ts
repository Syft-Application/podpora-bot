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

interface SlackProductCommand {
    name: string,
    desc: string,
    example: string
}

interface ProductConfig {
    commands: Array<SlackProductCommand>,
    dialogs: Dialogs,
    issueParams: (
        submission: Submission,
        user: SlackUser,
        request_type: string
    ) => IssueParams,
    productMessageText: (
        submission: Submission,
        user: SlackUser,
        request_type: string
    ) => string
}

const configs: { [index: string]: ProductConfig } = {};

configs.default = {
    commands: [
        {
            name: 'idea',
            desc: 'Submit new product idea',
            example: '/product idea'
        }
    ],
    dialogs: {
        idea: {
            callback_id: '',
            title: 'New Product Idea (beta)',
            submit_label: 'Submit',
            state: 'product_idea',
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
        const board = 'IDEA';
        const issue_type = 'Idea';
        const desc = `${submission.description}

Submitted by: ${user.name}`;

        return {
            fields: {
                project: { key: board },
                summary: title,
                issuetype: { name: issue_type },
                description: desc,
            }
        };
    },
    productMessageText(
        submission: Submission,
        user: SlackUser,
        request_type: string
    ): string {
        return `<@${user.id}> has submitted a new product idea:\n\n` +
            `*${submission.title}*\n\n${submission.description}`;
    }
};

export default function productConfig(key: string): ProductConfig {
    return configs[key];
}
