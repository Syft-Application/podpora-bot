'use strict';

import { Response, Request } from 'express';
import logger from '../../../util/logger';
import { store } from '../../../util/secrets';
import { Slack } from '../../../lib/slack';
import { support } from '../../../lib/support';
import {
    PostCommandPayload
} from '../../../lib/slack/api_interfaces';

function postCommandHandler(payload: PostCommandPayload, res: Response): Response {
    const { team_id, command } = payload;
    const slack_config = store.slackTeamConfig(team_id);
    const slack = new Slack(slack_config);

    if (command === '/support') {
        return support.handleCommand(slack, payload, res);
    }

    return res.json({
        text: 'Unknown or not implemented command.'
    });
}

/**
 * POST /api/slack/command
 *
 */
export const postCommand = (req: Request, res: Response): void => {
    try {
        postCommandHandler(req.body, res);
    } catch (error) {
        logger.error('postCommand', error);
        res.json({
            text: 'Something went wrong while processing the command ;('
        });
    }
};
