'use strict';

import { Response, Request } from 'express';
import logger from '../../../util/logger';
import { store } from '../../../util/secrets';
import { SlackTeam } from '../../../lib/slack_team';
import { Jira } from '../../../lib/jira';
import { support } from '../../../lib/support';
import {
    InteractionTypes,
    PostInteractionPayload
} from '../../../lib/slack/api_interfaces';

function handleDialogSubmission(params: PostInteractionPayload, res: Response): Response {
    const { team, state } = params;
    const [type, subtype] = state.split('_');
    const slack_config = store.slackTeamConfig(team.id);
    const slack_team = new SlackTeam(slack_config);
    const jira_config = store.jiraConfig(team.id);
    const jira = new Jira(jira_config);

    if (type !== 'support') {
        throw new Error('Unexpected state param: ' + state);
    }

    return support.handleDialogSubmission(
        slack_team, jira, params, subtype, res
    );
}

function interactionHandler(params: PostInteractionPayload, res: Response): Response {
    if (params.type !== InteractionTypes.dialog_submission) {
        throw new Error('Unexpected interaction: ' + params.type);
    }

    return handleDialogSubmission(params, res);
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
    res.json({});
};
