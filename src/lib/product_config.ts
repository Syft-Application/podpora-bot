import fs from 'fs';
import path from 'path';
import { View } from '@slack/web-api';
import { SlackUser, Submission } from './slack/api_interfaces';

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

interface Views {
    [index: string]: View
}

interface SlackProductCommand {
    name: string,
    desc: string,
    example: string
}

interface ProductConfig {
    commands: Array<SlackProductCommand>,
    view: (key: string) => View,
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

const viewsDirectoryPath = path.join(__dirname, '..', 'views', 'product', 'default');
const views: Views = {};
fs.readdirSync(viewsDirectoryPath).reduce((acc, name: string) => {
    const fpath = path.join(viewsDirectoryPath, name);
    acc[path.parse(fpath).name] = JSON.parse(
        fs.readFileSync(fpath).toString()
    );
    return acc;
}, views);

const configs: { [index: string]: ProductConfig } = {};

configs.default = {
    commands: [
        {
            name: 'idea',
            desc: 'Submit new product idea',
            example: '/product idea'
        }
    ],
    view: function(key: string): View {
        return views[key];
    },
    issueParams: function(
        submission: Submission,
        user: SlackUser,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                labels: ['product']
            }
        };
    },
    productMessageText(
        submission: Submission,
        user: SlackUser,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request_type: string
    ): string {
        return `<@${user.id}> has submitted a new product idea:\n\n` +
            `*${submission.title}*\n\n${submission.description}`;
    }
};

export default function productConfig(key: string): ProductConfig {
    return configs[key];
}
