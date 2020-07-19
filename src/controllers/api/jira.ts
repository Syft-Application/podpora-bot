'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';

/**
 * POST /api/jira/:id
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    logger.info('jiraPostEvent', req.body);
    // const { webhookEvent, issue, changelog } = req.body;

    // if (req.body.webhookEvent === 'jira:issue_updated') {
    //     const status_change = changelog.items.find((el) => el.field === 'status');
    //     const ticket_number = issue.key;
    //     req.body
    //             return support.fetch(key)
    //         .then((val) => {
    //             if (val === null) {
    //                 return Promise.reject(new Error(`Issue key not found: ${key}`));
    //             }
    //             return Promise.resolve(val.split(',').pop() as string);
    //         });

    //     //     if (status_change) {
    //     redis.client.hmget(`jira ${req.body.issue.id}`, ['ts'], (err1, res1) => {
    //         const changed_from = status_change.fromString;
    //         const changed_to = status_change.toString;
    //         const [ts] = res1;

    //         redis.client.hmget(ts, ['request_channel_id'], (err2, res2) => {
    //             const [request_channel_id] = res2;
    //             slackWeb.chat.postMessage({
    //                 channel: request_channel_id,
    //                 text: `Jira ticket status changed from *${changed_from}* to *${changed_to}*`,
    //                 thread_ts: ts,
    //             }).catch((err) => console.log(err));
    //         });
    //     });
    //     //     }

    // }

    res.status(200).send();
};
