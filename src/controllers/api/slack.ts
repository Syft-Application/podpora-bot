'use strict';

import { Response, Request } from 'express';
import { WebAPICallResult } from '@slack/web-api';
import logger from '../../util/logger';
import {
    webClient as slackWeb,
    SlackDialogs,
    SlackMessages
} from '../../config/slack';

import {
    SlackTeam
} from '../../lib/slack_team';

import * as jira from '../../config/jira';

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

/* eslint-disable @typescript-eslint/no-explicit-any */
function postUserRequestToSlack(
    submission: Record<string, string>,
    submission_type: string,
    team: { id: string, domain: string },
    user: Record<string, string>
): Promise<any> {

    const msg_text = slackRequestMessageText(submission, submission_type, user.id);
    const slack_team = new SlackTeam(team);
    return slack_team.postSupportRequest(msg_text)
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
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
    const body = JSON.parse(req.body.payload);
    const {
        state,
        user,
        team,
        submission,
    } = body;

    postUserRequestToSlack(submission, state, team, user);

    res.status(200).send();
};
