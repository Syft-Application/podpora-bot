'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import { store } from '../../util/secrets';
import { SlackTeam } from '../../lib/slack_team';
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

function jiraIssueUpdatedHandler(
    team_id: string,
    issue: Issue,
    changelog: IssueChangelog
): void {
    const slack_config = store.slackTeamConfig(team_id);
    const slack_team = new SlackTeam(slack_config);
    const jira_config = store.jiraConfig(team_id);
    const jira = new Jira(jira_config);
    const issue_key = jira.toKey(issue);
    const status_change = changelog.items.find((el) => el.field === 'status');

    store.get(issue_key, (err, res) => {
        if (err) {
            logger.error(err.message);
            return;
        }
        if (res === null) {
            logger.error(`Slack thread not found for issue: ${issue_key}`);
            return;
        }

        const [, channel, ts] = res.split(',');
        let message: string;

        if (status_change) {
            const changed_from = status_change.fromString;
            const changed_to = status_change.toString;
            message = `Ticket status changed from *${changed_from}* to *${changed_to}*`;

            slack_team.postOnThread(
                message,
                channel,
                ts
            );
        }
    });
}

/**
 * POST /api/jira/:team_id
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    const team_id = req.params.team_id;
    const { webhookEvent, issue, changelog } = req.body;

    try {
        if (webhookEvent === 'jira:issue_updated') {
            jiraIssueUpdatedHandler(team_id, issue, changelog);
        }
    } catch (error) {
        logger.error('postEvent', error, req.body);
    }

    res.status(200).send();
};
