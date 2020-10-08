'use strict';

import { Response, Request } from 'express';
import logger, { sanitise_for_log } from '../../../util/logger';
import { store } from '../../../util/secrets';
import { Slack } from '../../../lib/slack';
import { Jira } from '../../../lib/jira';
import { support } from '../../../lib/support';
import { product } from '../../../lib/product';
import {
    DialogSubmission,
    ViewSubmission,
    InteractionTypes,
    PostInteractionPayload
} from '../../../lib/slack/api_interfaces';

function handleViewSubmission(params: ViewSubmission, res: Response): Response {
    const { team, view } = params;
    const private_metadata = view.private_metadata;
    const [type, subtype] = view.private_metadata.split('_');
    const slack_options = store.slackOptions(team.id);
    const slack = new Slack(slack_options);
    const jira_options = store.jiraOptions(team.id);
    const jira = new Jira(jira_options);

    if (type === 'support') {
        return support.handleViewSubmission(
            slack, jira, params, subtype, res
        );
    }

    throw new Error('Unexpected state param: ' + private_metadata);
}

function handleDialogSubmission(params: DialogSubmission, res: Response): Response {
    const { team, state } = params;
    const [type, subtype] = state.split('_');
    const slack_options = store.slackOptions(team.id);
    const slack = new Slack(slack_options);
    const jira_options = store.jiraOptions(team.id);
    const jira = new Jira(jira_options);

    if (type === 'support') {
        return support.handleDialogSubmission(
            slack, jira, params, subtype, res
        );
    }

    if (type === 'product') {
        return product.handleDialogSubmission(
            slack, jira, params, subtype, res
        );
    }

    throw new Error('Unexpected state param: ' + state);
}

function interactionHandler(params: PostInteractionPayload, res: Response): Response {
    if (params.type == InteractionTypes.dialog_submission) {
        return handleDialogSubmission(params as DialogSubmission, res);
    }

    if (params.type == InteractionTypes.view_submission) {
        return handleViewSubmission(params as ViewSubmission, res);
    }

    throw new Error('Unexpected interaction: ' + params.type);
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
