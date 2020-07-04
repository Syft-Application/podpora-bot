import {
    Dialog,
    WebAPICallResult,
    WebClient
} from '@slack/web-api';
import logger from '../util/logger';
import { TeamConfig } from '../util/secrets';

interface SlackUser { id: string, name: string }
interface SlackMessage extends WebAPICallResult { ts: string, channel: string }

class SlackTeam {
    constructor(config: TeamConfig) {
        this.id = config.id;
        this.domain = config.domain;
        this.support_channel_id = config.support_channel_id;
        this.client = new WebClient(config.api_token);
    }

    id: string;
    domain: string;
    support_channel_id: string;
    client: WebClient;

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
        thread: SlackMessage
    ): Promise<WebAPICallResult> {
        return this.client.chat.postMessage({
            text: messageText,
            channel: thread.channel,
            thread_ts: thread.ts
        });
    }

    messageUrl(message: SlackMessage): string {
        const domain = this.domain;
        const channel_id = message.channel;
        const message_id = message.ts;
        return `https://${domain}.slack.com/archives/${channel_id}/p${message_id}`;
    }
}

export {
    SlackMessage,
    SlackUser,
    SlackTeam
};
