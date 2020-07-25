'use strict';

import { Response, Request } from 'express';
import logger, { sanitise_for_log } from '../../../util/logger';
import { store } from '../../../util/secrets';
import { Slack } from '../../../lib/slack';
import { Jira } from '../../../lib/jira';
import { support } from '../../../lib/support';
import {
    EventCallbackPayload,
    isChannelThreadFileShareEvent,
    isUrlVerification,
    PostEventPayloads
} from '../../../lib/slack/api_interfaces';

function handleCallbackEvent(payload: EventCallbackPayload, res: Response): Response {
    const { event, team_id } = payload;
    // TODO: maybe some more specific dispatch based on rules
    if (isChannelThreadFileShareEvent(event)) {
        const slack_config = store.slackTeamConfig(team_id);
        const slack = new Slack(slack_config);
        const jira_config = store.jiraConfig(team_id);
        const jira = new Jira(jira_config);

        support.addFileToJiraIssue(slack, jira, event);
    }

    return res.status(200).send();
}

function eventHandler(payload: PostEventPayloads, res: Response): Response {
    logger.info('postEvent', sanitise_for_log(payload));
    if (isUrlVerification(payload)) {
        return res.json({ challenge: payload.challenge });
    } else {
        // 'event_callback':
        return handleCallbackEvent(
            payload as EventCallbackPayload,
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
