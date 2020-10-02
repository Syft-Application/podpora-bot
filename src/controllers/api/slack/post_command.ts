'use strict';

import { Response, Request } from 'express';
import logger from '../../../util/logger';
import { store } from '../../../util/secrets';
import feature from '../../../util/feature';
import { Slack } from '../../../lib/slack';
import { support } from '../../../lib/support';
import { product } from '../../../lib/product';
import {
    PostCommandPayload
} from '../../../lib/slack/api_interfaces';

/**
 * POST /api/slack/command
 *
 */
export const postCommand = (req: Request, res: Response): void => {
    try {
        const payload: PostCommandPayload = req.body;
        const { team_id, command } = payload;
        const slack_options = store.slackOptions(team_id);
        const slack = new Slack(slack_options);

        if (command === '/support' || feature.is_enabled(`support_command_${command}`)) {
            support.handleCommand(slack, payload, res);
        } else if (command === '/product') {
            product.handleCommand(slack, payload, res);
        } else {
            res.json({
                text: 'Unknown or not implemented command.'
            });
        }
    } catch (error) {
        logger.error('postCommand', error);
        res.json({
            text: 'Something went wrong while processing the command ;('
        });
    }
};
