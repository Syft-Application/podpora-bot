import {
    View,
    WebAPICallResult,
    WebClient
} from '@slack/web-api';
import logger from '../util/logger';
import { SlackOptions } from '../util/secrets';

interface SlackMessage extends WebAPICallResult {
    ts: string,
    channel: string,
    message: {
        team: string
    }
}

interface UserProfile {
    real_name: string
}

interface SlackThreadMessage {
    ts: string,
    channel: string,
    text: string,
    thread_ts: string
}

class Slack {
    constructor(config: SlackOptions) {
        this.id = config.id;
        this.domain = config.domain;
        this.client = new WebClient(config.api_token);
    }

    id: string;
    domain: string;
    client: WebClient;

    callbackId(): string {
        return `${this.id}${(new Date()).getTime()}`;
    }

    showModalView(
        view: View,
        trigger_id: string
    ): Promise<WebAPICallResult> {
        view.callback_id = this.callbackId();

        return this.client.views.open({
            view,
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

    userName(user_id: string): Promise<string> {
        return this.client.users.info({
            user: user_id
        }).then((response: WebAPICallResult) => {
            const user = response.user as UserProfile;
            return Promise.resolve(user.real_name);
        }).catch(() => {
            throw new Error('Unexpected error #userName');
        });
    }
}

export {
    SlackMessage,
    Slack
};
