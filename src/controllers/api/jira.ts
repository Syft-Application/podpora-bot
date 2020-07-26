'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import { store } from '../../util/secrets';
import { Slack } from '../../lib/slack';
import { Jira } from '../../lib/jira';

interface IssueChangelog {
    id: string
    items: Array<{
        field: string
        fieldtype: string
        fieldId: string
        from: string
        fromString: string
        to: string
        toString: string
    }>
}

interface Attachment {
    self: string
    id: string
    filename: string
    mimeType: string
    content: string
}

interface Issue {
    id: string
    key: string,
    self: string,
    fields: {
        attachment: Array<Attachment>
    }
}

function handleJiraIssueUpdate(
    jira: Jira,
    issue: Issue,
    changelog: IssueChangelog,
    slack_thread: { team: string, channel: string, ts: string }
): void {
    const slack_options = store.slackOptions(slack_thread.team);
    const slack = new Slack(slack_options);
    const status_change = changelog.items.find((el) => el.field === 'status');
    const attachment_change = changelog.items.find((el) => el.field === 'Attachment');
    let message: string;

    if (status_change) {
        const changed_from = status_change.fromString;
        const changed_to = status_change.toString;
        message = `Status changed from *${changed_from}* to *${changed_to}*`;

        slack.postOnThread(
            message,
            slack_thread.channel,
            slack_thread.ts
        );
    }

    if (attachment_change) {
        const filename = attachment_change.toString;

        const attachment = issue.fields.attachment.find((el) => {
            return el.filename == filename;
        });

        if (!attachment) {
            return;
        }

        message = `File [${filename}] has been attached. \n` +
            `Download: ${attachment.content}`;

        slack.postOnThread(
            message,
            slack_thread.channel,
            slack_thread.ts
        );
    }
}

/**
 * POST /api/jira/:team_id
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    // try {
    const { webhookEvent, issue, changelog } = req.body;
    const team_id = req.params.team_id;
    const jira_options = store.jiraOptions(team_id);
    if (jira_options) {
        if (webhookEvent === 'jira:issue_updated') {
            const jira = new Jira(jira_options);
            const issue_key = jira.toKey(issue);

            store.get(issue_key)
                .then((res) => {
                    if (res === null) {
                        logger.error(`Slack thread not found for issue: ${issue_key}`);
                        return;
                    }

                    const [team, channel, ts] = res.split(',');
                    handleJiraIssueUpdate(
                        jira,
                        issue,
                        changelog,
                        { team, channel, ts }
                    );
                }).catch((error) => {
                    logger.error(error.message);
                });
        }
    } else {
        logger.error(`Missing config for team ${team_id}`);
    }
    // } catch (error) {
    //     logger.error('postEvent', error, req.body);
    // }

    res.status(200).send();
};
