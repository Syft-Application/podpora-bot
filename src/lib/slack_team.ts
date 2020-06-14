import { SLACK_API_TOKEN, SLACK_TEAMS } from './../util/secrets';
import {
    Dialog,
    WebClient,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';

interface TeamApiObject {
    id: string,
    domain: string
}

interface TeamConfig {
    [index: string]: string;

    support_channel_id: string
}

interface ChatPostMessageResult extends WebAPICallResult {
    channel: string;
    ts: string;
    message: {
        text: string;
    }
}

function teamConfig(team_id: string): TeamConfig {
    // return (<TeamConfig>SLACK_TEAMS[team_id]);
    // return (SLACK_TEAMS[team_id] as TeamConfig);
    return SLACK_TEAMS[team_id];
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

const callbackPrefix = '31bafaf4';

function callbackId(): string {
    return `${callbackPrefix}${(new Date()).getTime()}`;
}

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

class SlackTeam {
    constructor(team: TeamApiObject) {
        logger.debug(team);
        this.id = team.id;
        this.domain = team.domain;
        this.config = teamConfig(this.id);
        // TODO: api token should be per team
        this.client = new WebClient(SLACK_API_TOKEN);
    }

    id: string;
    domain: string;
    client: WebClient;
    config: TeamConfig;

    postSupportRequest(msg: string): Promise<WebAPICallResult> {
        const channel_id = this.config.support_channel_id;

        return this.client.chat.postMessage({
            text: msg,
            channel: channel_id
        }).catch((error) => {
            logger.error(error.message);

            return Promise.reject({ ok: false });
        });
    }

    showSupportRequestForm(request_type: string, trigger_id: string): Promise<WebAPICallResult> {
        const dialog = SlackDialogs[request_type]();

        return this.client.dialog.open({
            dialog,
            trigger_id,
        }).catch((err) => {
            logger.error(err.message);
            return Promise.reject({ ok: false });
        });
    }
}

export {
    ChatPostMessageResult,
    SlackTeam
};
