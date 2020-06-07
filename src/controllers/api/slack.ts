'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import { WebClient, Dialog } from '@slack/web-api';

const slackWeb = new WebClient('');

const commandHelpResponse = {
    text: '👋 Need help with support bot?\n\n'
        + '> Submit a request for data:\n>`/support data`\n\n'
        + '> Submit a bug report:\n>`/support bug`'
};

const openBugDialog = (text: string, trigger_id: string) => {
    const dialog: Dialog = {
        callback_id: `syft${(new Date()).getTime()}`, // Needs to be unique
        title: 'Report Bug',
        submit_label: 'Submit',
        state: 'bug',
        elements: [
            {
                type: 'text',
                label: 'Title',
                placeholder: 'eg. Employer 1234 can\'t see shifts',
                name: 'title',
                value: text || '',
            },
            {
                type: 'textarea',
                label: 'Steps to Reproduce',
                placeholder: 'Bullet point steps to reproduce. Incude specifics, eg. urls and ids',
                name: 'reproduce',
                value: '',
            },
            {
                type: 'text',
                label: 'Expected Outcome',
                placeholder: 'What *should* happen when the above steps are taken?',
                name: 'expected',
                value: '',
            },
            {
                type: 'text',
                label: 'Current Outcome',
                placeholder: 'What *currently* happens when the above steps are taken?',
                name: 'currently',
                value: '',
            },
        ]
    };

    slackWeb.dialog.open({
        dialog,
        trigger_id,
    }).catch((err) => {
        logger.error(err.message);
    });
};


/**
 * POST /api/slack/command
 *
 */
export const postCommand = (req: Request, res: Response) => {
    const { body: { command, text, trigger_id } } = req;
    const args = text.trim().split(/\s+/);
    let response_body = commandHelpResponse;

    if (args[0] === 'bug') {
        response_body = null;

        openBugDialog('', trigger_id);
    }

    res.status(200).send(response_body);
};

/**
 * POST /api/slack/event
 *
 */
export const postEvent = (req: Request, res: Response) => {
    res.json({ hello: 'world' });
};
