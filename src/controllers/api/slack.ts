'use strict';

import { Response, Request } from 'express';
import { WebAPICallResult } from '@slack/web-api';
import logger from '../../util/logger';
import {
    SlackTeam
} from '../../lib/slack_team';

import * as jira from '../../config/jira';

const commandHelpResponse = {
    text: '👋 Need help with support bot?\n\n'
        + '> Submit a request for data:\n>`/support data`\n\n'
        + '> Submit a bug report:\n>`/support bug`'
};

function linkJiraIssueToSlackMessage(
    team: Record<string, string>,
    slack_message: Record<string, string>,
    jira_response: Record<string, string>
): void {
    logger.debug(team);
    logger.debug(slack_message);
    logger.debug(jira_response);
}

interface ChatPostMessageResult extends WebAPICallResult {
    channel: string;
    ts: string;
    message: {
        text: string;
    }
}

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
            const slack_message = value.message;
            jira.createIssueFromSlackMessage(slack_message)
                .then((jira_response: Record<string, string>) => {
                    linkJiraIssueToSlackMessage(team, slack_message, jira_response);
                });
        })
        .catch((err) => {
            // TODO: log function arguments for debug purposes
            logger.error(err);
        });

    res.status(200).send();
};
