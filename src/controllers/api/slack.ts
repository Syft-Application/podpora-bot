'use strict';

import { Response, Request } from 'express';
import logger, { sanitise_for_log } from '../../util/logger';
import { store } from '../../util/secrets';
import {
    paramsToSubmission,
    strToSubmissionType,
    SlackTeam,
} from '../../lib/slack_team';

import { Jira } from '../../lib/jira';

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
        const request_type = strToSubmissionType(args[0]);

        if (request_type !== null) {
            slack_team.showSupportRequestForm(request_type, trigger_id);
        } else {
            response_body = commandHelpResponse;
        }
    } catch (error) {
        logger.error('postCommand', error);
    }

    res.status(200).send(response_body);
};

/**
 * POST /api/slack/event
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    const { body } = req;

    if (body.challenge) {
        res.json({ challenge: body.challenge });
        return;
    }

    logger.info('postEvent', sanitise_for_log(body));
    res.status(200).send(null);
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
        team
    } = body;
    const submission_params = body.submission;

    try {
        const slack_config = store.slackTeamConfig(team.id);
        const slack_team = new SlackTeam(slack_config);
        const jira_config = store.jiraConfig(team.id);
        const jira = new Jira(jira_config);
        const submission = paramsToSubmission(state, submission_params);

        slack_team.postSupportRequest(submission, user)
            .then((support_request) => {
                jira.createIssue(support_request)
                    .then((issue) => {
                        slack_team.postIssueLinkOnThread(
                            support_request,
                            issue
                        );
                    });
            });
    } catch (error) {
        // TODO: log params for debuging
        logger.error('postInteraction', error);
    }

    res.status(200).send();
};
