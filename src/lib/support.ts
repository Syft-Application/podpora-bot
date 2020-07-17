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
        slack: SlackTeam,
        jira: Jira,
        event: ChannelThreadFileShareEvent
    ): void {
        support.issueKey(slack.id, event.channel, event.thread_ts)
            .then((issue_key: string) => {
                const comment = fileShareEventToIssueComment(event);
                jira.addComment(issue_key, comment);
            }).catch((error) => {
                logger.error('addFileToJiraIssue', error);
            });
    }
};

function fileShareEventToIssueComment(event: ChannelThreadFileShareEvent): string {
    const files_str = event.files.map(slackFileToText).join('\n');

    return `${event.text}\n\n${files_str}\n`;
}


// function isSlackImageFile(
//     file: SlackFiles
// ): file is SlackImageFile {
//     return (<SlackImageFile>file).thumb_360 !== undefined;
// }

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
    return `${file.name} - ` +
        `[download](${file.url_private_download}) or ` +
        `[see on Slack](${file.permalink})`;
}

interface ChannelEvent {
    ts: string,
    type: string,
    team: string,
    channel: string,
}

interface ChannelThreadEvent extends ChannelEvent {
    thread_ts: string
    text: string
}

interface SlackFile {
    id: string
    name: string
    mimetype: string
    filetype: string
    url_private: string
    url_private_download: string
    permalink: string
}

interface SlackImageFile extends SlackFile {
    thumb_360: string
}

type SlackFiles = SlackImageFile | SlackFile;

interface ChannelThreadFileShareEvent extends ChannelThreadEvent {
    subtype: string
    files: Array<SlackFile>
}

export {
    BugSubmission,
    DataSubmission,
    Submission,
    SupportRequests,
    support
};
