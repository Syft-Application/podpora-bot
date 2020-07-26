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

function handleCallbackEvent(payload: EventCallbackPayload): void {
    const { event, team_id } = payload;
    const slack_options = store.slackOptions(team_id);
    const slack = new Slack(slack_options);

    // TODO: maybe some more specific dispatch based on rules
    if (isChannelThreadFileShareEvent(event)) {
        const jira_options = store.jiraOptions(team_id);
        const jira = new Jira(jira_options);

        support.addFileToJiraIssue(slack, jira, event);
    }
}

function eventHandler(payload: PostEventPayloads, res: Response): void {
    if (isUrlVerification(payload)) {
        res.json({ challenge: payload.challenge });
    } else {
        // 'event_callback':
        handleCallbackEvent(
            payload as EventCallbackPayload
        );

        res.status(200).send();
    }
}

/**
 * POST /api/slack/event
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    try {
        eventHandler(
            req.body,
            res
        );
    } catch (error) {
        logger.error('postEvent', error, sanitise_for_log(req.body));
        res.status(200).send();
    }
};
