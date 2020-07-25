import {
    Dialog,
    WebAPICallResult,
    WebClient
} from '@slack/web-api';
import logger from '../util/logger';
import { TeamConfig } from '../util/secrets';

interface SlackMessage extends WebAPICallResult {
    ts: string,
    channel: string,
    message: {
        team: string
    }
}

interface SlackThreadMessage {
    ts: string,
    channel: string,
    text: string,
    thread_ts: string
}

class Slack {
    constructor(config: TeamConfig) {
        this.id = config.id;
        this.domain = config.domain;
        this.support_channel_id = config.support_channel_id;
        this.client = new WebClient(config.api_token);
        this.support_config_name = config.support_config_name;
    }

    id: string;
    domain: string;
    support_channel_id: string;
    client: WebClient;
    support_config_name: string;

    callbackId(): string {
        return `${this.id}${(new Date()).getTime()}`;
    }

    showDialog(
        dialog: Dialog,
        trigger_id: string
    ): Promise<WebAPICallResult> {
        dialog.callback_id = this.callbackId();

        return this.client.dialog.open({
            dialog,
            trigger_id
        });
    }

    postMessage(
        messageText: string,
        channel_id: string
    ): Promise<SlackMessage> {
        return this.client.chat.postMessage({
            text: messageText,
            channel: channel_id
        }).then((response) => {
            return Promise.resolve(response as SlackMessage);
        }).catch((error) => {
            logger.error('postMessage', error.message);
            throw new Error('Unexpected error in postMessage');
        });
    }

    postOnThread(
        messageText: string,
        channel_id: string,
        thread_ts: string
    ): Promise<WebAPICallResult> {
        return this.client.chat.postMessage({
            text: messageText,
            channel: channel_id,
            thread_ts: thread_ts
        });
    }

    messageUrl(message: SlackMessage): string {
        const domain = this.domain;
        const channel_id = message.channel;
        const message_id = message.ts;
        return `https://${domain}.slack.com/archives/${channel_id}/p${message_id}`;
    }

    threadMessageUrl(message: SlackThreadMessage): string {
        const domain = this.domain;
        const channel_id = message.channel;
        const message_id = message.ts;
        const thread_ts = message.thread_ts;
        return `https://${domain}.slack.com/archives/` +
            `${channel_id}/p${message_id}?thread_ts=${thread_ts}&cid=${channel_id}`;
    }

    toKey(message: SlackMessage): string {
        const {
            channel,
            ts,
            message: { team }
        } = message;

        return [team, channel, ts].join(',');
    }

    supportConfigName(): string {
        return this.support_config_name;
    }
}

export {
    SlackMessage,
    Slack
};
