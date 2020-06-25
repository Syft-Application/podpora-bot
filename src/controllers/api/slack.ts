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

function sanitise_for_log(data: Record<string, unknown>): Record<string, unknown> {
    const copy = Object.assign({}, data);

    copy.token = 'sanitised';
    return copy;
}

/**
 * POST /api/slack/command
 *
 */
export const postCommand = (req: Request, res: Response): void => {
    const { body: { text, trigger_id, team_id } } = req;
    let response_body = null;

    try {
        const args = text.trim().split(/\s+/);
        const request_type = args[0];
        const slack_config = store.slackTeamConfig(team_id);
        const slack_team = new SlackTeam(team_id, slack_config);

        if (request_type === 'bug' || request_type === 'data') {
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
        team,
        submission,
    } = body;

    try {
        const slack_config = store.slackTeamConfig(team.id);
        const jira_config = store.jiraConfig(team.id);

        const slack_team = new SlackTeam(team.id, slack_config);
        slack_team.postSupportRequest(submission, state, user)
            .then((support_request: SupportRequest) => {
                const jira = new Jira(jira_config);
                jira.createIssue(support_request)
                    .then((issue: IssueWithUrl) => {
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
