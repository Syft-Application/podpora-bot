'use strict';

import { Response, Request } from 'express';
import logger, { sanitise_for_log } from '../../../util/logger';
import { store } from '../../../util/secrets';
import {
    SlackTeam
} from '../../../lib/slack_team';

import { Jira } from '../../../lib/jira';
import {
    support
} from '../../../lib/support';

interface ChannelEvent {
    ts: string,
    type: string,
    team: string,
    channel: string,
}

interface ChannelThreadEvent extends ChannelEvent {
    thread_ts: string,
    text: string,
}

interface SlackFile {
    id: string
    name: string
    mimetype: string
    filetype: string
    url_private: string
    url_private_download: string
    thumb_360?: string
    permalink: string
}

interface ChannelThreadFileShareEvent extends ChannelThreadEvent {
    subtype: string
    files: Array<SlackFile>
}

type ChannelEvents = ChannelThreadFileShareEvent | ChannelThreadEvent | ChannelEvent;

interface EventCallbackPayload {
    token: string,
    type: string,
    team_id: string,
    event: ChannelEvents
}

// function isChannelThreadEvent(event: ChannelEvents): event is ChannelThreadEvent {
//     return (<ChannelThreadEvent>event).thread_ts !== undefined;
// }

function isChannelThreadFileShareEvent(
    event: ChannelEvents
): event is ChannelThreadFileShareEvent {
    return (<ChannelThreadFileShareEvent>event).subtype === 'file_share';
}

function eventCallbackHandler(payload: EventCallbackPayload, res: Response): Response {
    const { event, team_id } = payload;

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
        return eventCallbackHandler(
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
