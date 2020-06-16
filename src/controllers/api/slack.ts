'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import {
    ChatPostMessageResult,
    SlackTeam
} from '../../lib/slack_team';

import * as jira from '../../lib/jira';

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
    const { body: { text, trigger_id, team_id, team_domain } } = req;
    const args = text.trim().split(/\s+/);
    const request_type = args[0];
    const team = { id: team_id, domain: team_domain };
    const slack_team = new SlackTeam(team);
    let response_body = commandHelpResponse;

    if (request_type === 'bug' || request_type === 'data') {
        response_body = null;
        slack_team.showSupportRequestForm(request_type, trigger_id)
            .catch((err) => {
                logger.error(err.message);
            });
    }

    res.status(200).send(response_body);
};

/**
 * POST /api/slack/event
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    const { body } = req;

    res.json({ challenge: body.challenge });
};

/**
 * POST /api/slack/interaction
 *
 */
export const postInteraction = (req: Request, res: Response): void => {
    const body = JSON.parse(req.body.payload);
    const {
        state,
        user,
        team,
        submission,
    } = body;

    const slack_team = new SlackTeam(team);
    slack_team.postSupportRequest(submission, state, user)
        .then((value: ChatPostMessageResult) => {
            const support_request = {
                id: value.ts,
                team: team,
                user: user,
                submission: submission,
                type: state
            };
            jira.createIssue(support_request)
                .then((jira_response: Record<string, string>) => {
                    logger.debug(jira_response);
                    // linkJiraIssueToSlackMessage(support_request, jira_response);
                });
        }).catch((err) => {
            // TODO: log function arguments for debug purposes
            logger.error(err);
        });

    res.status(200).send();
};
