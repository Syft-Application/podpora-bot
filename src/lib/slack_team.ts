import { SLACK_API_TOKEN, SLACK_TEAMS } from './../util/secrets';
import {
    Dialog,
    WebClient,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';
import { templates as slack_form_templates } from './slack_form_templates';

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

function slackRequestMessageText(
    submission: Record<string, string>,
    state: string,
    user_id: string
): string {
    const state_to_text = state === 'bug' ? 'bug report' : `${state} request`;
    const descFn = (state === 'bug') ? SlackMessages.bug : SlackMessages.default;
    const description = descFn(submission);

    return `<@${user_id}> has submitted a ${state_to_text}:\n\n` +
        `*${submission.title}*\n\n${description}`;
}

class SlackTeam {
    constructor(team: TeamApiObject) {
        logger.debug(team);
        this.id = team.id;
        this.domain = team.domain;
        this.config = SLACK_TEAMS[team.id];
        // TODO: api token should be per team
        this.client = new WebClient(SLACK_API_TOKEN);
    }

    id: string;
    domain: string;
    client: WebClient;
    config: TeamConfig;

    callbackId(): string {
        return `${this.domain}${(new Date()).getTime()}`;
    }

    postSupportRequest(
        submission: Record<string, string>,
        submission_type: string,
        user: { id: string, name: string }
    ): Promise<WebAPICallResult> {
        const channel_id = this.config.support_channel_id;
        const msg_text = slackRequestMessageText(submission, submission_type, user.id);

        return this.client.chat.postMessage({
            text: msg_text,
            channel: channel_id
        }).catch((error) => {
            logger.error(error.message);

            return Promise.reject({ ok: false });
        });
    }

    showSupportRequestForm(request_type: string, trigger_id: string): Promise<WebAPICallResult> {
        const dialog: Dialog = slack_form_templates[request_type];
        dialog.callback_id = this.callbackId();

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
