'use strict';

import { Response, Request } from 'express';
import logger from '../../util/logger';
import { store } from '../../util/secrets';
import { Slack } from '../../lib/slack';
import { Jira } from '../../lib/jira';
import {
    IssueChangelog,
    Issue,
    IssueLink,
    DetailIssueLinks,
    isOutwardIssueDetailLink,
    DetailInwardIssueLink,
    DetailOutwardIssueLink
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

function issueLinkToMessage(jira: Jira, link: DetailIssueLinks): string {
    let issue;
    let what;
    let lnk;
    if (isOutwardIssueDetailLink(link)) {
        lnk = link as DetailOutwardIssueLink;
        what = lnk.type.outward;
        issue = lnk.outwardIssue;
    } else {
        lnk = link as DetailInwardIssueLink;
        what = lnk.type.inward;
        issue = lnk.inwardIssue;
    }

    const url = jira.issueUrl(issue);
    const summary = issue.fields.summary;
    const status = issue.fields.status.name;

    return `${what} ${url} \n${summary} \nStatus: ${status}`;
}

function handleIssueLinkCreated(jira: Jira, issueLink: IssueLink): void {
    function updateIssueSlackThread(issue: Issue): void {
        const issue_key = jira.toKey(issue);

        store.get(issue_key)
            .then((res) => {
                if (res === null) {
                    return;
                }

                const link = issue.fields.issuelinks
                    .find((el) => {
                        return parseInt(el.id) === issueLink.id;
                    });

                if (link === undefined) {
                    return;
                }

                const message = issueLinkToMessage(jira, link);

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
            });
    }

    const source_issue_promise = jira.find(issueLink.sourceIssueId);

    source_issue_promise
        .then(updateIssueSlackThread);

    const dest_issue_promise = jira.find(issueLink.destinationIssueId);

    dest_issue_promise
        .then(updateIssueSlackThread);
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
        res.status(200).send();
    } else {
        res.status(404).send({ error: 'Team not found' });
    }
};
