import fs from 'fs';
import path from 'path';
import slugify from '@sindresorhus/slugify';
import { View } from '@slack/web-api';
import {
    SlackUser,
    Submission,
    ViewSubmission
} from './slack/api_interfaces';
import {
    normalisedTitleAndDesc,
    viewInputVal,
    viewSelectedVal
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
    viewToSubmission: (
        view: ViewSubmission['view'],
        request_type: string
    ) => Submission,
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


function viewToSubmission(
    view: ViewSubmission['view'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request_type: string
): Submission {
    const values = view.state.values;
    const submission: Submission = {};
    submission.title = viewInputVal('sl_title', values);
    submission.description = viewInputVal('ml_description', values);
    submission.affected_users = viewInputVal('sl_affected_users', values);
    const prod_area_value = viewSelectedVal('sl_product_area', values);
    const urgency_value = viewSelectedVal('sl_urgency', values);

    if (prod_area_value) {
        submission.product_area = prod_area_value;
    }
    if (urgency_value) {
        submission.urgency = urgency_value;
    }

    return submission;
}

const configs: { [index: string]: ProductConfig } = {};

configs.default = {
    commands: [
        {
            name: 'idea',
            desc: 'Submit new product idea',
            example: '/idea'
        }
    ],
    view: function(key: string): View {
        return views[key];
    },
    viewToSubmission: viewToSubmission,
    issueParams: function(
        submission: Submission,
        user: SlackUser,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        request_type: string,
    ): IssueParams {
        const title_and_desc = normalisedTitleAndDesc(submission);
        const title = title_and_desc.title;
        let desc = title_and_desc.desc;
        const board = 'IDEA';
        const issue_type = 'Idea';
        desc = `${desc}

Affected Users: ${submission.affected_users}
Product Area: ${submission.product_area}
Urgency: ${submission.urgency}

Submitted by: ${user.name}`;
        const labels = [];

        labels.push('product');

        if (submission.urgency) {
            labels.push(slugify(submission.urgency));
        }
        if (submission.product_area) {
            labels.push(slugify(submission.product_area));
        }

        return {
            fields: {
                project: { key: board },
                summary: title,
                issuetype: { name: issue_type },
                description: desc,
                labels: labels
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
            `*${submission.title}*\n\n${submission.description}\n\n` +
            `Affected Users: ${submission.affected_users}\n` +
            `Product Area: ${submission.product_area}\n` +
            `Urgency: ${submission.urgency}`;
    }
};

export default function productConfig(key: string): ProductConfig {
    return configs[key];
}
