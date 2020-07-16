'use strict';

import { Response, Request } from 'express';
import logger from '../../../util/logger';
import { store } from '../../../util/secrets';
import {
    SlackTeam
} from '../../../lib/slack_team';

import { Jira } from '../../../lib/jira';
import {
    support
} from '../../../lib/support';

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
