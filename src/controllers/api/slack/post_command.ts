'use strict';

import { Response, Request } from 'express';
import logger from '../../../util/logger';
import { store } from '../../../util/secrets';
import {
    SlackTeam
} from '../../../lib/slack_team';

import {
    support,
    SupportRequests
} from '../../../lib/support';

const commandHelpResponse = {
    text: '👋 Need help with support bot?\n\n'
        + '> Submit a request for data:\n>`/support data`\n\n'
        + '> Submit a bug report:\n>`/support bug`'
};

interface PostCommandPayload {
    token: string
    team_id: string
    team_domain: string
    enterprise_id: string
    enterprise_name: string
    channel_id: string
    channel_name: string
    user_id: string
    user_name: string
    command: string
    text: string
    response_url: string
    trigger_id: string
}

function supportCommandHandler(payload: PostCommandPayload, res: Response): Response {
    const { text, trigger_id, team_id } = payload;
    const args = text.trim().split(/\s+/);
    const slack_config = store.slackTeamConfig(team_id);
    const slack_team = new SlackTeam(slack_config);
    if (support.requestTypes().includes(args[0])) {
        support.showForm(slack_team, args[0] as SupportRequests, trigger_id);
        res.json({});
    } else {
        res.json(commandHelpResponse);
    }

    return res;
}

function postCommandHandler(payload: PostCommandPayload, res: Response): Response {
    // "switch" statements should have at least 3 "case" clauses (sonarjs/no-small-switch)
    // switch (payload.command) {
    //     case '/support':
    //         return supportCommandHandler(payload, res);
    //     default:
    //         return res.json({
    //             text: 'Unknown or not implemented command.'
    //         });
    // }
    if (payload.command === '/support') {
        return supportCommandHandler(payload, res);
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
