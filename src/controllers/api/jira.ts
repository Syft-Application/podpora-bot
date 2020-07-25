'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import { store } from '../../util/secrets';
import { Slack } from '../../lib/slack';
import { Jira, Issue } from '../../lib/jira';

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

function handleJiraIssueUpdate(
    slack: Slack,
    jira: Jira,
    issue: Issue,
    changelog: IssueChangelog,
    slack_thread: { channel: string, ts: string }
): void {
    const status_change = changelog.items.find((el) => el.field === 'status');
    const attachment_change = changelog.items.find((el) => el.field === 'Attachment');
    let message: string;

    if (status_change) {
        const changed_from = status_change.fromString;
        const changed_to = status_change.toString;
        message = `Ticket status changed from *${changed_from}* to *${changed_to}*`;

        slack.postOnThread(
            message,
            slack_thread.channel,
            slack_thread.ts
        );
    }

    if (attachment_change) {
        const filename = attachment_change.toString;
        const issue_url = jira.issueUrl(issue);
        message = `File [${filename}] has been attached to the Jira ticket, ` +
            `view it here ${issue_url}`;

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
    const slack_config = store.slackTeamConfig(team_id);
    if (!slack_config) {
        logger.error(`Missing config for team ${team_id}`);
        res.status(200).send();
        return;
    }
    const slack = new Slack(slack_config);
    const jira_config = store.jiraConfig(team_id);
    const jira = new Jira(jira_config);

    if (webhookEvent === 'jira:issue_updated') {
        const issue_key = jira.toKey(issue);

        store.get(issue_key)
            .then((res) => {
                if (res === null) {
                    logger.error(`Slack thread not found for issue: ${issue_key}`);
                    return;
                }

                const [, channel, ts] = res.split(',');
                handleJiraIssueUpdate(
                    slack,
                    jira,
                    issue,
                    changelog,
                    { channel, ts }
                );
            }).catch((error) => {
                logger.error(error.message);
            });
    }
    // } catch (error) {
    //     logger.error('postEvent', error, req.body);
    // }

    res.status(200).send();
};
