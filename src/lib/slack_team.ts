import {
    Dialog,
    WebClient,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';
import { templates as slack_form_templates } from './slack_form_templates';
import { IssueWithUrl } from './jira';
import { TeamConfig } from '../util/secrets';

interface SlackUser { id: string, name: string }

interface SupportRequest {
    id: string,
    team_id: string,
    user: SlackUser,
    submission: Submission,
    type: SubmissionType,
    url: string,
    channel: string
}

interface ErrorResponse {
    ok: false
}

const enum SubmissionType {
    BUG,
    DATA
}

interface BugSubmission {
    type: SubmissionType.BUG,
    title: string,
    description: string
    currently: string,
    expected: string
}

interface DataSubmission {
    type: SubmissionType.DATA,
    title: string,
    description: string
}

type Submission = BugSubmission | DataSubmission;

interface ApiErrorHandler {
    (error: Record<string, string>): Promise<ErrorResponse>
}

function slackError(source: string): ApiErrorHandler {
    return function(error: Record<string, string>): Promise<ErrorResponse> {
        logger.error(source, error.message);

        return Promise.reject({ ok: false });
    };
}

function slackRequestMessageText(
    submission: Submission,
    user_id: string
): string {
    switch (submission.type) {
        case SubmissionType.DATA:
            return `<@${user_id}> has submitted a data request:\n\n` +
                `*${submission.title}*\n\n${submission.description}`;

        case SubmissionType.BUG:
            return `<@${user_id}> has submitted a bug report:\n\n` +
                `*${submission.title}*\n\n` +
                `*Steps to Reproduce*\n\n${submission.description}\n\n` +
                `*Currently*\n\n${submission.currently}\n\n` +
                `*Expected*\n\n${submission.expected}`;
    }
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
        user: SlackUser
    ): Promise<SupportRequest> {
        const channel_id = this.config.support_channel_id;
        const msg_text = slackRequestMessageText(submission, user.id);
        return this.client.chat.postMessage({
            text: msg_text,
            channel: channel_id
        }).then((value: WebAPICallResult) => {
            const support_request = {
                id: value.ts,
                team_id: this.id,
                user: user,
                submission: submission,
                type: submission.type,
                url: `https://${this.domain}.slack.com/archives/${channel_id}/p${value.ts}`,
                channel: channel_id
            } as SupportRequest;
            return Promise.resolve(support_request);
        }).catch((error) => {
            logger.error('postSupportRequest', error.message);
            throw new Error('Unexpected error in postSupportRequest');
        });
        // });
        // }).catch(slackError('postSupportRequest'));
    }

    showSupportRequestForm(
        request_type: SubmissionType,
        trigger_id: string
    ): Promise<WebAPICallResult | ErrorResponse> {
        let dialog: Dialog;
        switch (request_type) {
            case SubmissionType.DATA:
                dialog = slack_form_templates['data'];
                break;
            case SubmissionType.BUG:
                dialog = slack_form_templates['bug'];
                break;
        }
        dialog.callback_id = this.callbackId();

        return this.client.dialog.open({
            dialog,
            trigger_id,
        }).then(() => {
            return Promise.resolve({ ok: true });
        }).catch(slackError('showSupportRequestForm'));
    }

    postIssueLinkOnThread(
        issue: IssueWithUrl
    ): Promise<WebAPICallResult | ErrorResponse> {
        const msg_text =
            'Jira ticket created! \n' +
            'Please keep an eye on ticket status to see when it is done! \n' +
            `${issue.url}`;

        // TODO: do not leak 3th party promise
        return this.client.chat.postMessage({
            text: msg_text,
            channel: issue.slack_channel_id,
            thread_ts: issue.slack_thread_id
        }).catch(slackError('postIssueLinkOnThread'));
    }
}

function strToSubmissionType(str: string): SubmissionType | null {
    switch (str) {
        case 'bug':
            return SubmissionType.BUG;
        case 'data':
            return SubmissionType.DATA;
        default:
            return null;
    }
}

function paramsToSubmission(
    state: string,
    params: Submission
): Submission {
    switch (state) {
        case SubmissionType.BUG.toString():
            params.type = SubmissionType.BUG;
            return params as BugSubmission;
        case SubmissionType.DATA.toString():
            params.type = SubmissionType.DATA;
            return params as DataSubmission;
        default:
            throw new Error('Unexpected object: ' + state);
    }
}

export {
    paramsToSubmission,
    strToSubmissionType,
    ErrorResponse,
    SupportRequest,
    BugSubmission,
    DataSubmission,
    SubmissionType,
    Submission,
    SlackTeam
};
