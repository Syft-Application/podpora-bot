import { SLACK_API_TOKEN, SLACK_TEAMS } from './../util/secrets';
import {
    Dialog,
    WebClient,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';
import { templates as slack_form_templates } from './slack_form_templates';
import { IssueWithUrl } from './jira';

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

interface SlackUser { id: string, name: string }

interface SupportRequest {
    id: string,
    team: TeamApiObject,
    user: SlackUser,
    submission: Submission,
    type: string,
    channel: string
}

interface ErrorResponse {
    ok: false
}

interface Submission {
    title: string
}

interface BugSubmission extends Submission {
    reproduce: string,
    currently: string,
    expected: string
}

interface DataSubmission {
    title: string,
    description: string
}

function slackError(error: Record<string, string>): Promise<ErrorResponse> {
    logger.error(error.message);

    return Promise.reject({ ok: false });
}

const SlackMessages: { [index: string]: (submission: Submission) => string } = {
    bug: (submission: BugSubmission): string => {
        const { reproduce, currently, expected } = submission;

        return '*Steps to Reproduce*\n\n' +
            `${reproduce}\n\n` +
            '*Currently*\n\n' + `${currently}\n\n` +
            `*Expected*\n\n${expected}`;
    },
    default: (submission: DataSubmission): string => {
        return submission.description;
    }
};

function slackRequestMessageText(
    submission: Submission,
    state: string,
    user_id: string
): string {
    const state_to_text = state === 'bug' ? 'bug report' : `${state} request`;
    const descFn = (state === 'bug') ? SlackMessages.bug : SlackMessages.default;
    const description = descFn(submission);

    return `<@${user_id}> has submitted a ${state_to_text}:\n\n` +
        `*${submission.title}*\n\n${description}`;
}

// enum SupportRequestTypes {
//     bug = 'bug',
//     data = 'data'
// }

interface SupportRequest {
    id: string,
    team: { id: string, domain: string },
    user: SlackUser,
    submission: Submission,
    type: string,
    channel: string
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
                team: this,
                user: user,
                submission: submission,
                type: submission_type,
                channel: channel_id
            };
            return Promise.resolve(support_request);
        }).catch(slackError);
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
        }).catch(slackError);
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
        }).catch(slackError);
    }
}

export {
    ChatPostMessageResult,
    SupportRequest,
    SlackTeam
};
