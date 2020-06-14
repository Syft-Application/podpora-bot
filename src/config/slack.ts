import { SLACK_API_TOKEN, SLACK_TEAMS } from './../util/secrets';
import { WebClient, Dialog } from '@slack/web-api';

const webClient = new WebClient(SLACK_API_TOKEN);

// TODO:
// Returns support config per team.
// At the moment taken from env but we can move it to a different storage
function teamConfig(team_id: string): Record<string, string> {
    return SLACK_TEAMS[team_id];
}

const callbackPrefix = '31bafaf4';

function callbackId(): string {
    return `${callbackPrefix}${(new Date()).getTime()}`;
}

const bug_form_tpl: Dialog = {
    callback_id: '',
    title: 'Report Bug',
    submit_label: 'Submit',
    state: 'bug',
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
            name: 'reproduce',
            value: '',
        },
        {
            type: 'text',
            label: 'Expected Outcome',
            placeholder: 'What *should* happen when the above steps are taken?',
            name: 'expected',
            value: '',
        },
        {
            type: 'text',
            label: 'Current Outcome',
            placeholder: 'What *currently* happens when the above steps are taken?',
            name: 'currently',
            value: '',
        },

    ]
};

const SlackDialogs: { [index: string]: () => Dialog } = {
    bug: (): Dialog => {
        const form = bug_form_tpl;
        form.callback_id = callbackId();

        return form;
    },

    data: (): Dialog => {
        return {
            callback_id: callbackId(), // Needs to be unique
            title: 'New Data Request',
            submit_label: 'Submit',
            state: 'data',
            elements: [
                {
                    type: 'text',
                    label: 'Title',
                    placeholder: 'eg. Number of shifts per employer in Feb 2019',
                    name: 'title',
                    value: '',
                },
                {
                    type: 'textarea',
                    label: 'Description',
                    placeholder: 'Please include any extra information required, eg. column names',
                    name: 'description',
                    value: '',
                },
            ],
        };
    }
};

const SlackMessages: { [index: string]: (submission: Record<string, string>) => string } = {
    bug: (submission: Record<string, string>): string => {
        const { reproduce, currently, expected } = submission;

        return '*Steps to Reproduce*\n\n' +
            `${reproduce}\n\n` +
            '*Currently*\n\n' + `${currently}\n\n` +
            `*Expected*\n\n${expected}`;
    },
    default: (submission: Record<string, string>): string => {
        return submission.description;
    }
};

export {
    webClient,
    teamConfig,
    SlackDialogs,
    SlackMessages
};
