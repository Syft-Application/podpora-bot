import {
    Dialog,
    WebClient,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';
import { templates as slack_form_templates } from './slack_form_templates';
import { IssueWithUrl } from './jira';
import { TeamConfig } from '../util/secrets';

interface ChatPostMessageResult extends WebAPICallResult {
    channel: string;
    ts: string;
    message: {
        text: string;
    }
}

interface SlackUser { id: string, name: string }

interface SupportRequest {
    id: string,
    team_id: string,
    user: SlackUser,
    submission: Submission,
    type: string,
    url: string,
    channel: string
}

interface ErrorResponse {
    ok: false
}

interface Submission {
    title: string
    description: string,
}

interface BugSubmission extends Submission {
    currently: string,
    expected: string
}

interface ApiErrorHandler {
    (error: Record<string, string>): Promise<ErrorResponse>
}

function slackError(source: string): ApiErrorHandler {
    return function(error: Record<string, string>): Promise<ErrorResponse> {
        logger.error(source, error.message);

        return Promise.reject({ ok: false });
    };
}

const SlackMessages: { [index: string]: (submission: Submission, user_id: string) => string } = {
    bug: (submission: BugSubmission, user_id: string): string => {
        return `<@${user_id}> has submitted a bug report:\n\n` +
            `*${submission.title}*\n\n` +
            `*Steps to Reproduce*\n\n${submission.description}\n\n` +
            `*Currently*\n\n${submission.currently}\n\n` +
            `*Expected*\n\n${submission.expected}`;
    },
    data: (submission: Submission, user_id: string): string => {
        return `<@${user_id}> has submitted a data request:\n\n` +
            `*${submission.title}*\n\n${submission.description}`;
    }
};

function slackRequestMessageText(
    submission: Submission,
    state: string,
    user_id: string
): string {
    return SlackMessages[state](submission, user_id);
}

class SlackTeam {
    constructor(config: TeamConfig) {
        this.id = config.id;
        this.domain = config.domain;
        this.config = config;
        // TODO: api token should be per team
        this.client = new WebClient(this.config.api_token);
    }
    id: string;
    domain: string;
    client: WebClient;
    config: TeamConfig;

    callbackId(): string {
        return `${this.id}${(new Date()).getTime()}`;
    }

    postSupportRequest(
        submission: Submission,
        submission_type: string,
        user: { id: string, name: string }
    ): Promise<SupportRequest | ErrorResponse> {
        const channel_id = this.config.support_channel_id;
        const msg_text = slackRequestMessageText(submission, submission_type, user.id);
        return this.client.chat.postMessage({
            text: msg_text,
            channel: channel_id
        }).then((value: ChatPostMessageResult) => {
            const support_request = {
                id: value.ts,
                team_id: this.id,
                user: user,
                submission: submission,
                type: submission_type,
                url: `https://${this.domain}.slack.com/archives/${channel_id}/p${value.ts}`,
                channel: channel_id
            };
            return Promise.resolve(support_request);
        }).catch(slackError('postSupportRequest'));
    }

    showSupportRequestForm(
        request_type: string,
        trigger_id: string
    ): Promise<WebAPICallResult | ErrorResponse> {
        const dialog: Dialog = slack_form_templates[request_type];
        dialog.callback_id = this.callbackId();

        return this.client.dialog.open({
            dialog,
            trigger_id,
        }).then(() => {
            return Promise.resolve({ ok: true });
        }).catch(slackError('showSupportRequestForm'));
    }

    postIssueLinkOnThread(
        support_request: SupportRequest,
        issue: IssueWithUrl
    ): Promise<WebAPICallResult | ErrorResponse> {
        const msg_text =
            'Jira ticket created! \n' +
            'Please keep an eye on ticket status to see when it is done! \n' +
            `${issue.url}`;

        return this.client.chat.postMessage({
            text: msg_text,
            channel: support_request.channel,
            thread_ts: support_request.id
        }).catch(slackError('postIssueLinkOnThread'));
    }
}

export {
    ChatPostMessageResult,
    SupportRequest,
    BugSubmission,
    SlackTeam
};
