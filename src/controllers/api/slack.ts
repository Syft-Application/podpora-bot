'use strict';

import { Response, Request } from 'express';
import logger, { sanitise_for_log } from '../../util/logger';
import { store } from '../../util/secrets';
import {
    SlackTeam
} from '../../lib/slack_team';

import { Jira } from '../../lib/jira';
import {
    support
} from '../../lib/support';
import { postCommand } from './slack/post_command';

const enum InteractionTypes {
    dialog_submission = 'dialog_submission'
}

interface InteractionPayload {
    type: InteractionTypes,
    token: string,
    action_ts: string,
    team: {
        id: string,
        domain: string
    },
    user: {
        id: string,
        name: string
    },
    channel: {
        id: string,
        name: string
    },
    submission: {
        title: string,
        description: string
        currently: string,
        expected: string
    },
    callback_id: string,
    response_url: string,
    state: string
}

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

function supportRequestSubmissionHandler(
    params: InteractionPayload,
    request_type: string,
    res: Response
): Response {
    const {
        user,
        team,
        submission
    } = params;

    const slack_config = store.slackTeamConfig(team.id);
    const slack_team = new SlackTeam(slack_config);
    const jira_config = store.jiraConfig(team.id);
    const jira = new Jira(jira_config);

    support.createSupportRequest(submission, user, request_type, slack_team, jira);

    return res;
}

function dialogSubmissionHandler(params: InteractionPayload, res: Response): Response {
    // here will be dispatch on type of dialog submision
    // for now we have only support requests
    const state = params.state;
    if (!support.requestTypes().includes(state)) {
        throw new Error('Unexpected state param: ' + state);
    }

    return supportRequestSubmissionHandler(params, state, res);
}

function interactionHandler(params: InteractionPayload, res: Response): Response {
    if (params.type !== InteractionTypes.dialog_submission) {
        throw new Error('Unexpected interaction: ' + params.type);
    }

    return dialogSubmissionHandler(params, res);
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

/**
 * POST /api/slack/interaction
 *
 */
export const postInteraction = (req: Request, res: Response): void => {
    try {
        interactionHandler(
            JSON.parse(req.body.payload),
            res
        );
    } catch (error) {
        logger.error('postInteraction', error, req.body);
    }
    res.status(200).send({});
};

export { postCommand };
