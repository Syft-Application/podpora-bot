'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import { store } from '../../util/secrets';
import {
    SupportRequest,
    SlackTeam
} from '../../lib/slack_team';

import {
    IssueWithUrl,
    Jira
} from '../../lib/jira';

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

    const slack_config = store.slackTeamConfig(team_id);
    const slack_team = new SlackTeam(team_id, team_domain, slack_config);
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

    const slack_config = store.slackTeamConfig(team.id);
    const jira_config = store.jiraConfig(team.id);

    const slack_team = new SlackTeam(team.id, team.domain, slack_config);
    slack_team.postSupportRequest(submission, state, user)
        .then((support_request: SupportRequest) => {
            const jira = new Jira(jira_config);
            jira.createIssue(support_request)
                .then((issue: IssueWithUrl) => {
                    slack_team.postIssueLinkOnThread(
                        support_request,
                        issue
                    );
                }).catch((err) => {
                    logger.error(err);
                });

        }).catch((err) => {
            // TODO: log function arguments for debug purposes
            logger.error(err);
        });

    res.status(200).send();
};
