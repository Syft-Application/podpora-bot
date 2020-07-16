'use strict';

import { Response, Request } from 'express';
import logger from '../../../util/logger';
import { store } from '../../../util/secrets';
import {
    SlackTeam
} from '../../../lib/slack_team';

import {
    support
} from '../../../lib/support';

const commandHelpResponse = {
    text: '👋 Need help with support bot?\n\n'
        + '> Submit a request for data:\n>`/support data`\n\n'
        + '> Submit a bug report:\n>`/support bug`'
};

/**
 * POST /api/slack/command
 *
 */
export const postCommand = (req: Request, res: Response): void => {
    const { body: { text, trigger_id, team_id } } = req;
    let response_body = null;

    try {
        const slack_config = store.slackTeamConfig(team_id);
        const slack_team = new SlackTeam(slack_config);
        const args = text.trim().split(/\s+/);

        if (support.requestTypes().includes(args[0])) {
            support.showForm(slack_team, args[0], trigger_id);
        } else {
            response_body = commandHelpResponse;
        }
    } catch (error) {
        logger.error('postCommand', error);
    }

    res.status(200).send(response_body);
};
