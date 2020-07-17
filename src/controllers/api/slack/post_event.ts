'use strict';

import { Response, Request } from 'express';
import logger, { sanitise_for_log } from '../../../util/logger';
import { store } from '../../../util/secrets';
import { SlackTeam } from '../../../lib/slack_team';
import { Jira } from '../../../lib/jira';
import { support } from '../../../lib/support';
import {
    EventCallbackPayload,
    isChannelThreadFileShareEvent
} from '../../../lib/slack/api_interfaces';

function handleCallbackEvent(payload: EventCallbackPayload, res: Response): Response {
    const { event, team_id } = payload;
    // TODO: maybe some more specific dispatch based on rules
    if (isChannelThreadFileShareEvent(event)) {
        const slack_config = store.slackTeamConfig(team_id);
        const slack_team = new SlackTeam(slack_config);
        const jira_config = store.jiraConfig(team_id);
        const jira = new Jira(jira_config);

        support.addFileToJiraIssue(slack_team, jira, event);
    }

    return res.json({});
}

function eventHandler(body: Record<string, unknown>, res: Response): Response {
    logger.info('postEvent', sanitise_for_log(body));
    if (body.type === 'url_verification') {
        return res.json({ challenge: body.challenge });
    } else {
        // 'event_callback':
        return handleCallbackEvent(
            body as unknown as EventCallbackPayload,
            res
        );
    }
}

/**
 * POST /api/slack/event
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    const { body } = req;
    // try {
    eventHandler(
        body,
        res
    );
    // } catch (error) {
    //     logger.error('postEvent', error, sanitise_for_log(body));
    // }
};
