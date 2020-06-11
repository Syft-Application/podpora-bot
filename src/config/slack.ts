import { SLACK_API_TOKEN } from './../util/secrets';
import { WebClient, Dialog } from '@slack/web-api';

const webClient = new WebClient(SLACK_API_TOKEN);
const env = process.env;

// TODO:
// returns config per team
// at the moment taken from env but we can move it to
// som db like redis
/* eslint-disable @typescript-eslint/no-unused-vars */
function teamConfig(team_id: string): Record<string, string> {
    return {
        support_channel_id: env['SLACK_SUPPORT_CHANNEL_ID']
    };
}
/* eslint-enable @typescript-eslint/no-unused-vars */

const callbackPrefix = '31bafaf4';

const SlackDialogs: { [index: string]: () => Dialog } = {
    bug: (): Dialog => {
        return {
            callback_id: `${callbackPrefix}${(new Date()).getTime()}`, // Needs to be unique
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
                    placeholder: 'Bullet point steps to reproduce. Incude specifics, eg. urls and ids',
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
    },

    data: (): Dialog => {
        return {
            callback_id: `${callbackPrefix}${(new Date()).getTime()}`, // Needs to be unique
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
