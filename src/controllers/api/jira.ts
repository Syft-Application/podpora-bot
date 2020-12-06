'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import { store } from '../../util/secrets';
import { Slack } from '../../lib/slack';
import { Jira } from '../../lib/jira';
import {
    IssueChangelog,
    Issue ,
    IssueLink ,
    DetailIssueLink
} from '../../lib/jira/api_interfaces';

import feature from '../../util/feature';

interface SlackThread {
    team: string
    channel: string
    ts: string
}

function handleStatusChange(
    issue: Issue,
    changelog: IssueChangelog,
    slack_thread: SlackThread
): void {
    const slack_options = store.slackOptions(slack_thread.team);
    const slack = new Slack(slack_options);
    const status_change = changelog.items.find((el) => el.field === 'status');
    const resolution_change = changelog.items.find((el) => el.field === 'resolution');

    if (!status_change) {
        return;
    }

    const changed_from = status_change.fromString;
    const changed_to = status_change.toString;
    let message = `Status changed from *${changed_from}* to *${changed_to}*`;

    if (resolution_change && resolution_change.toString !== 'Done') {
        message = `${message}\nResolution: ${resolution_change.toString}`;
    }

    slack.postOnThread(
        message,
        slack_thread.channel,
        slack_thread.ts
    );
}

function handleAttachmentChange(
    issue: Issue,
    changelog: IssueChangelog,
    slack_thread: SlackThread
): void {
    const slack_options = store.slackOptions(slack_thread.team);
    const slack = new Slack(slack_options);
    const attachment_change = changelog.items.find((el) => el.field === 'Attachment');
    if (!attachment_change) {
        return;
    }

    const filename = attachment_change.toString;
    const attachment = issue.fields.attachment.find((el) => {
        return el.filename == filename;
    });

    if (!attachment) {
        return;
    }

    const message = `File [${filename}] has been attached. \n` +
        `Download: ${attachment.content}`;

    slack.postOnThread(
        message,
        slack_thread.channel,
        slack_thread.ts
    );
}

function issueLinksToMessage(jira: Jira, links: Array<DetailIssueLink>): string {
    const links_text = links.map((link) => {
        let issue;
        if (link.outwardIssue) {
            issue = link.outwardIssue;
        } else {
            issue = link.inwardIssue;
        }

        const url = jira.issueUrl(issue);
        const summary = issue.fields.summary;
        return ` - ${link.type.inward} ${url} "${summary}"`;
    });

    return links_text.join('\n');
}

function handleIssueLinkCreated(jira: Jira, issueLink: IssueLink):void {
    const issue_promise = jira.find(issueLink.sourceIssueId);

    issue_promise.then((issue: Issue) => {
        const issue_key = jira.toKey(issue);

        store.get(issue_key)
            .then((res) => {
                if (res === null) {
                    return;
                }

                const message = issueLinksToMessage(jira, issue.fields.issuelinks);

                const [team, channel, ts] = res.split(',');
                const slack_thread = { team, channel, ts };
                const slack_options = store.slackOptions(slack_thread.team);
                const slack = new Slack(slack_options);

                slack.postOnThread(
                    message,
                    slack_thread.channel,
                    slack_thread.ts
                );
            }).catch((error) => {
                logger.error(error.message);
                // return Promise.resolve(null);
            });
    });
}

/**
 * POST /api/jira/:team_id
 *
 */
export const postEvent = (req: Request, res: Response): void => {
    // try {
    const { webhookEvent, issue, changelog } = req.body;
    const team_id = req.params.team_id;
    const jira_options = store.jiraOptions(team_id);

    if (jira_options) {
        if (webhookEvent === 'jira:issue_updated') {
            const jira = new Jira(jira_options);
            const issue_key = jira.toKey(issue);

            store.get(issue_key)
                .then((res) => {
                    if (res === null) {
                        logger.error(`Slack thread not found for issue: ${issue_key}`);
                        return;
                    }

                    const [team, channel, ts] = res.split(',');
                    const slack_thread = { team, channel, ts };
                    handleStatusChange(issue, changelog, slack_thread);
                    handleAttachmentChange(issue, changelog, slack_thread);

                }).catch((error) => {
                    logger.error(error.message);
                });
        } else if (webhookEvent === 'issuelink_created') {
            const jira = new Jira(jira_options);
            const { issueLink } = req.body;

            if (feature.is_enabled('jira_links_change_updates')) {
                handleIssueLinkCreated(jira, issueLink);
            }
        }
    } else {
        logger.error(`Missing config for team ${team_id}`);
    }
    // } catch (error) {
    //     logger.error('postEvent', error, req.body);
    // }

    res.status(200).send();
};
