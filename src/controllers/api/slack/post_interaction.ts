'use strict';

import { Response, Request } from 'express';
import logger, { sanitise_for_log } from '../../../util/logger';
import { store } from '../../../util/secrets';
import { Slack } from '../../../lib/slack';
import { Jira } from '../../../lib/jira';
import { support } from '../../../lib/support';
import {
    InteractionTypes,
    PostInteractionPayload
} from '../../../lib/slack/api_interfaces';

function handleDialogSubmission(params: PostInteractionPayload, res: Response): Response {
    const { team, state } = params;
    const [type, subtype] = state.split('_');
    const slack_options = store.slackOptions(team.id);
    const slack = new Slack(slack_options);
    const jira_options = store.jiraOptions(team.id);
    const jira = new Jira(jira_options);

    if (type !== 'support') {
        throw new Error('Unexpected state param: ' + state);
    }

    return support.handleDialogSubmission(
        slack, jira, params, subtype, res
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
        logger.error('postInteraction', error, sanitise_for_log(req.body));
    }

    res.status(200).send();
};
