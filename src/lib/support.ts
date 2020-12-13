import { Response } from 'express';
import {
    View,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';
import supportConfig from './support_config';
import {
    SlackMessage,
    Slack
} from './slack';
import { Jira } from './jira';
import {
    PostCommandPayload,
    ViewSubmission,
    Shortcut,
    ChannelThreadFileShareEvent,
    SlackUser,
    Submission
} from './slack/api_interfaces';
import { store } from './../util/secrets';
import {
    commandsNames,
    fileShareEventToIssueComment
} from './slack_jira_helpers';

const support = {
    showForm(
        slack: Slack,
        request_type: string,
        trigger_id: string
    ): Promise<WebAPICallResult> {
        const errorHandler = (error: Error): Promise<WebAPICallResult> => {
            logger.error('showForm', error.message);

            return Promise.reject({ ok: false });
        };

        const view: View = supportConfig(support.configName(slack)).view(request_type);

        return slack.showModalView(view, trigger_id)
            .catch(errorHandler);
    },

    postIssueUrlOnThread(
        slack: Slack,
        url: string,
        thread: SlackMessage
    ): Promise<SlackMessage> {
        const msg_text =
            `${url}\n` +
            'Thank You, we will post updates on this thread.';

        return slack.postOnThread(msg_text, thread.channel, thread.ts)
            .then((response) => {
                return Promise.resolve(response as SlackMessage);
            }).catch((error) => {
                logger.error('postIssueUrlOnThread', error.message);
                throw new Error('Unexpected error in postIssueUrlOnThread');
            });
    },

    createSupportRequest(
        slack: Slack,
        jira: Jira,
        submission: Submission,
        user: SlackUser,
        request_type: string
    ): void {
        const support_config = supportConfig(support.configName(slack));
        const message_text = support_config.supportMessageText(
            submission, user, request_type
        );
        const post_message = slack.postMessage(
            message_text,
            support.channel(slack)
        );
        const issue_params = support_config.issueParams(
            submission, user, request_type
        );
        const create_issue = jira.createIssue(issue_params);

        post_message.then((message) => {
            create_issue.then((issue) => {
                jira.addSlackThreadUrlToIssue(
                    slack.messageUrl(message),
                    issue
                );

                support.postIssueUrlOnThread(
                    slack,
                    jira.issueUrl(issue),
                    message
                );

                support.persist(
                    slack.toKey(message),
                    jira.toKey(issue)
                );
            });
        });
    },

    // slack_message, jira_issue
    persist(message_key: string, issue_key: string): void {
        store.set(
            message_key, issue_key,
            issue_key, message_key
        );
    },

    issueKey(team_id: string, channel_id: string, message_id: string): Promise<string> {
        const key = [team_id, channel_id, message_id].join(',');
        return store.get(key)
            .then((val) => {
                if (val === null) {
                    return Promise.reject(new Error(`Issue key not found: ${key}`));
                }
                return Promise.resolve(val.split(',').pop() as string);
            });
    },

    addFileToJiraIssue(
        slack: Slack,
        jira: Jira,
        event: ChannelThreadFileShareEvent
    ): void {
        support.issueKey(slack.id, event.channel, event.thread_ts)
            .then((issue_key: string) => {
                const user_name = slack.userName(event.user);
                const addComment = (name: string): void => {
                    const comment = fileShareEventToIssueComment(
                        event,
                        slack.threadMessageUrl(event),
                        name
                    );
                    jira.addComment(issue_key, comment);
                };
                user_name.then(addComment)
                    .catch(() => {
                        addComment(event.user);
                    });
            }).catch((error) => {
                logger.error(`addFileToJiraIssue: ${error}`);
            });
    },

    handleCommand(slack: Slack, payload: PostCommandPayload, res: Response): Response {
        const { text, trigger_id } = payload;
        const args = text.trim().split(/\s+/);
        const config = supportConfig(support.configName(slack));
        const commands = config.commands;
        const requests_types = commandsNames(commands);
        if (requests_types.includes(args[0])) {
            support.showForm(slack, args[0], trigger_id);
            return res.status(200).send();
        } else if (args[0] === 'ping') {
            return res.json({
                response_type: 'ephemeral',
                text: 'Pong!'
            });
        }

        return res.json({
            text: config.commandsHelpText()
        });
    },

    handleShortcut(slack: Slack, params: Shortcut, res: Response): Response {
        const { trigger_id, callback_id } = params;
        const command_name = callback_id.split('_')[1];
        const config = supportConfig(support.configName(slack));

        if (commandsNames(config.commands).includes(command_name)) {
            support.showForm(slack, command_name, trigger_id);
        } else {
            logger.debug(
                'handleShortcut',
                'Unexpected support shortcut',
                callback_id
            );
        }

        return res;
    },

    handleViewSubmission(
        slack: Slack,
        jira: Jira,
        payload: ViewSubmission,
        request_type: string,
        res: Response
    ): Response {
        const { user, view } = payload;
        const config = supportConfig(support.configName(slack));
        const submission = config.viewToSubmission(view, request_type);

        support.createSupportRequest(
            slack, jira, submission, user, request_type
        );

        return res;
    },

    configName: function(slack: Slack): string {
        return store.supportOptions(slack.id).config_name;
    },

    channel: function(slack: Slack): string {
        return store.supportOptions(slack.id).channel_id;
    }
};

export {
    fileShareEventToIssueComment,
    Submission,
    support
};
