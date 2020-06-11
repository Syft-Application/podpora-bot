'use strict';

import { Response, Request } from 'express';

import logger from '../../util/logger';
import {
    webClient as slackWeb,
    teamConfig,
    SlackDialogs,
    SlackMessages
} from '../../config/slack';

// import { jiraClient } from '../../config/jira';

const commandHelpResponse = {
    text: '👋 Need help with support bot?\n\n'
        + '> Submit a request for data:\n>`/support data`\n\n'
        + '> Submit a bug report:\n>`/support bug`'
};

function openSlackDialog(trigger_id: string, request_type: string): void {
    const dialog = SlackDialogs[request_type]();

    slackWeb.dialog.open({
        dialog,
        trigger_id,
    }).catch((err) => {
        logger.error(err.message);
    });
}

function slackRequestMessageText(
    submission: Record<string, string>,
    state: string,
    user_id: string
): string {
    const state_to_text = state === 'bug' ? 'bug report' : `${state} request`;
    const descFn = (state === 'bug') ? SlackMessages.bug : SlackMessages.default;
    const description = descFn(submission);

    return `<@${user_id}> has submitted a ${state_to_text}:\n\n` +
        `*${submission.title}*\n\n${description}`;
}

function postSlackMessage(
    submission: Record<string, string>,
    submission_type: string,
    team: Record<string, string>,
    user: Record<string, string>
): void {

    const team_config = teamConfig(team.id);
    const msg_text = slackRequestMessageText(submission, submission_type, user.id);

    slackWeb.chat.postMessage({
        text: msg_text,
        channel: team_config.support_channel_id
    }).catch((err) => {
        logger.error(err.message);
    });
}

/**
 * POST /api/slack/command
 *
 */
export const postCommand = (req: Request, res: Response): void => {
    const { body: { text, trigger_id } } = req;
    const args = text.trim().split(/\s+/);
    const request_type = args[0];
    let response_body = commandHelpResponse;

    if (request_type === 'bug' || request_type === 'data') {
        response_body = null;
        openSlackDialog(trigger_id, request_type);
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
    const {
        state,
        user,
        team,
        submission
    } = req.body.payload;

    postSlackMessage(submission, state, team, user);

    res.status(200).send();
};
