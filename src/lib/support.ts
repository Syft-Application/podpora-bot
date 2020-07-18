import { Response } from 'express';
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
import { Jira, Issue } from './jira';
import redis_client from '../util/redis_client';
import {
    PostCommandPayload,
    PostInteractionPayload,
    ChannelThreadFileShareEvent,
    SlackFiles,
    isSlackImageFile
} from './slack/api_interfaces';

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

const commandHelpResponse = {
    text: '👋 Need help with support bot?\n\n'
        + '> Submit a request for data:\n>`/support data`\n\n'
        + '> Submit a bug report:\n>`/support bug`'
};

function fileShareEventToIssueComment(
    event: ChannelThreadFileShareEvent,
    url: string
): string {
    const files_str = event.files.map(slackFileToText).join('\n\n');

    return `${event.text}\n\n${files_str}\n \n${url}\n`;
}

// Unfortunaly preview slack images does not work as explained here:
// https://community.atlassian.com/t5/Jira-Questions/ \
// How-to-embed-images-by-URL-in-new-Markdown-Jira-editor/qaq-p/1126329
// > in the New editor and the editing view used in Next-gen Projects,
// > is moving away from using wiki style markup to a WYSIWYG editing approach,
// if (isSlackImageFile(file)) {
//     f = `!${file.url_private}!\n` +
//         `[Download](${file.url_private_download}) or ` +
//         `[See on Slack](${file.permalink})`;
// } else {
// }
function slackFileToText(file: SlackFiles): string {
    if (isSlackImageFile(file)) {
        return `${file.name}\n` +
            `Preview: ${file.thumb_360}\n` +
            `Download: ${file.url_private_download}\n` +
            `Show: ${file.url_private}`;
    } else {
        return `${file.name}\n` +
            `Download: ${file.url_private_download}\n` +
            `Show: ${file.url_private}`;
    }
}

const support = {
    requestTypes(): ReadonlyArray<string> { return support_requests; },
    showForm(
        slack_team: SlackTeam,
        request_type: SupportRequests,
        trigger_id: string
    ): Promise<WebAPICallResult> {
        const dialog: Dialog = form_templates[request_type];

        return slack_team.showDialog(dialog, trigger_id)
            .catch((error) => {
                logger.error('showForm', error.message);

                return Promise.reject({ ok: false });
            });
    },

    postIssueUrlOnThread(
        slack_team: SlackTeam,
        url: string,
        thread: SlackMessage
    ): Promise<SlackMessage> {
        const msg_text =
            `${url}\n` +
            `We will post for you all updates on this thread.`;

        return slack_team.postOnThread(msg_text, thread)
            .then((response) => {
                return Promise.resolve(response as SlackMessage);
            }).catch((error) => {
                logger.error('postIssueUrlOnThread', error.message);
                throw new Error('Unexpected error in postIssueUrlOnThread');
            });
    },

    createSupportRequest(
        slack_team: SlackTeam,
        jira: Jira,
        submission: Submission,
        user: SlackUser,
        request_type: string
    ): void {
        const message_text = supportMessageText(submission, user, request_type);
        const p1 = slack_team.postMessage(message_text, slack_team.support_channel_id);
        const issue_params = issueParams(submission, user, request_type);
        const p2 = jira.createIssue(issue_params);

        p1.then((message) => {
            p2.then((issue) => {
                jira.addSlackThreadUrlToIssue(
                    slack_team.messageUrl(message),
                    issue
                );

                support.postIssueUrlOnThread(
                    slack_team,
                    jira.issueUrl(issue),
                    message
                );

                support.persist(message, issue);
            });
        });
    },

    persist(message: SlackMessage, issue: Issue): void {
        const {
            channel,
            ts: message_id,
            message: { team }
        } = message;

        const issue_key = [team, issue.key].join(',');
        const slack_key = [team, channel, message_id].join(',');

        redis_client().mset(slack_key, issue_key, issue_key, slack_key);
    },

    fetch(key: string): Promise<string | null> {
        // logger.debug('ss 2', typeof redis_client());
        return new Promise((resolve, reject) => {
            redis_client().get(key, (error, response) => {
                if (error) {
                    return reject(error);
                }

                return resolve(response);
            });
        });
    },

    issueKey(team_id: string, channel_id: string, message_id: string): Promise<string> {
        const key = [team_id, channel_id, message_id].join(',');
        return support.fetch(key)
            .then((val) => {
                if (val === null) {
                    return Promise.reject(new Error(`Issue key not found: ${key}`));
                }
                return Promise.resolve(val.split(',').pop() as string);
            });
    },

    addFileToJiraIssue(
        slack_team: SlackTeam,
        jira: Jira,
        event: ChannelThreadFileShareEvent
    ): void {
        support.issueKey(slack_team.id, event.channel, event.thread_ts)
            .then((issue_key: string) => {
                const comment = fileShareEventToIssueComment(
                    event,
                    slack_team.threadMessageUrl(event)
                );
                jira.addComment(issue_key, comment);
            }).catch((error) => {
                logger.error('addFileToJiraIssue', error);
            });
    },

    handleCommand(slack_team: SlackTeam, payload: PostCommandPayload, res: Response): Response {
        const { text, trigger_id } = payload;
        const args = text.trim().split(/\s+/);
        if (support.requestTypes().includes(args[0])) {
            support.showForm(slack_team, args[0] as SupportRequests, trigger_id);
            return res.json({});
        }

        return res.json(commandHelpResponse);
    },

    handleDialogSubmission(
        slack_team: SlackTeam,
        jira: Jira,
        payload: PostInteractionPayload,
        request_type: string,
        res: Response
    ): Response {
        const { user, submission } = payload;

        support.createSupportRequest(
            slack_team, jira, submission, user, request_type as SupportRequests
        );

        return res;
    }
};

export {
    fileShareEventToIssueComment,
    BugSubmission,
    DataSubmission,
    Submission,
    SupportRequests,
    support
};
