import {
    Dialog,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';
import { templates as form_templates } from './slack/form_templates';
import {
    SlackUser,
    SlackMessage,
    SlackTeam
} from './slack_team';
import supportMessageText from './slack/support_message_text';
import issueParams from './jira_create_issue_params';
import { Jira } from './jira';

const support_requests = ['bug', 'data'] as const;
type SupportRequests = typeof support_requests[number];

interface BugSubmission {
    title: string,
    description: string
    currently: string,
    expected: string
}

interface DataSubmission {
    title: string,
    description: string
}

type Submission = BugSubmission | DataSubmission;

const support = {
    requestTypes(): ReadonlyArray<string> { return support_requests; },
    showForm(
        slack: SlackTeam,
        request_type: SupportRequests,
        trigger_id: string
    ): Promise<WebAPICallResult> {
        const dialog: Dialog = form_templates[request_type];

        return slack.showDialog(dialog, trigger_id)
            .catch((error) => {
                logger.error('showForm', error.message);

                return Promise.reject({ ok: false });
            });
    },

    postIssueUrlOnThread(
        slack: SlackTeam,
        url: string,
        thread: SlackMessage
    ): Promise<SlackMessage> {
        const msg_text =
            'Jira ticket created! \n' +
            'Please keep an eye on ticket status to see when it is done! \n' +
            `${url}`;

        return slack.postOnThread(msg_text, thread)
            .then((response) => {
                return Promise.resolve(response as SlackMessage);
            }).catch((error) => {
                logger.error('postIssueUrlOnThread', error.message);
                throw new Error('Unexpected error in postIssueUrlOnThread');
            });
    },

    createSupportRequest(
        submission: Submission,
        user: SlackUser,
        request_type: string,
        slack: SlackTeam,
        jira: Jira
    ): void {
        const message_text = supportMessageText(submission, user, request_type);
        const p1 = slack.postMessage(message_text, slack.support_channel_id);
        const issue_params = issueParams(submission, user, request_type);
        const p2 = jira.createIssue(issue_params);

        p1.then((message) => {
            p2.then((issue) => {
                jira.addSlackThreadUrlToIssue(
                    slack.messageUrl(message),
                    issue
                );

                support.postIssueUrlOnThread(
                    slack,
                    jira.issueUrl(issue),
                    message
                );
            });
        });
    }

};

export {
    BugSubmission,
    DataSubmission,
    Submission,
    support
};
