import { Response } from 'express';
import {
    View,
    WebAPICallResult
} from '@slack/web-api';
import logger from '../util/logger';
import productConfig from './product_config';
import {
    SlackMessage,
    Slack
} from './slack';
import { Jira } from './jira';
import {
    PostCommandPayload,
    ChannelThreadFileShareEvent,
    SlackUser,
    Submission,
    ViewSubmission,
    ViewSubmissionInputValue,
    ViewSubmissionSelectValue
} from './slack/api_interfaces';
import {
    commandsNames,
    fileShareEventToIssueComment,
    SlackCommand,
} from './slack_jira_helpers';
import { store } from './../util/secrets';

function productCommandsHelpText(commands: Array<SlackCommand>): string {
    return '👋 Need help with product bot?\n\n' + commands.map(
        (cmd) => {
            return `> ${cmd.desc}:\n>\`${cmd.example}\``;
        }).join('\n\n');
}

function viewToSubmission(
    view: ViewSubmission['view'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request_type: string
): Submission {
    const values = view.state.values;
    const submission: Submission = {};
    const title_input = values.sl_title_block.sl_title as ViewSubmissionInputValue;
    const desc_input = values.ml_description_block.ml_description as ViewSubmissionInputValue;
    function selected(select_value: ViewSubmissionSelectValue): string | null {
        if (select_value.selected_option) {
            return select_value.selected_option.text.text;
        }

        return null;
    }
    const prod_area_value = selected(
        values.sl_product_area_block.sl_product_area as ViewSubmissionSelectValue
    );
    const urgency_value = selected(
        values.sl_urgency_block.sl_urgency as ViewSubmissionSelectValue
    );
    submission.title = title_input.value;
    submission.description = desc_input.value;
    if (prod_area_value) {
        submission.product_area = prod_area_value;
    }
    if (urgency_value) {
        submission.urgency = urgency_value;
    }

    return submission;
}

const product = {
    showForm(
        slack: Slack,
        request_type: string,
        trigger_id: string
    ): Promise<WebAPICallResult> {
        const view: View = productConfig(product.configName(slack)).view(request_type);

        return slack.showModalView(view, trigger_id)
            .catch((error) => {
                logger.error('showForm', error.message);

                return Promise.reject({ ok: false });
            });
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

    createProductRequest(
        slack: Slack,
        jira: Jira,
        submission: Submission,
        user: SlackUser,
        request_type: string
    ): void {
        const product_config = productConfig(product.configName(slack));
        const message_text = product_config.productMessageText(
            submission, user, request_type
        );
        const p1 = slack.postMessage(
            message_text,
            product.channel(slack)
        );
        const issue_params = product_config.issueParams(
            submission, user, request_type
        );
        const p2 = jira.createIssue(issue_params);

        p1.then((message) => {
            p2.then((issue) => {
                jira.addSlackThreadUrlToIssue(
                    slack.messageUrl(message),
                    issue
                );

                product.postIssueUrlOnThread(
                    slack,
                    jira.issueUrl(issue),
                    message
                );

                product.persist(
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
        product.issueKey(slack.id, event.channel, event.thread_ts)
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
        const commands = productConfig(product.configName(slack)).commands;
        const requests_types = commandsNames(commands);
        let request_type: string;

        if (requests_types.includes(args[0])) {
            request_type = args[0];
            product.showForm(slack, request_type, trigger_id);
            return res.status(200).send();
        }

        return res.json({
            text: productCommandsHelpText(commands)
        });
    },

    handleViewSubmission(
        slack: Slack,
        jira: Jira,
        payload: ViewSubmission,
        request_type: string,
        res: Response
    ): Response {
        const { user, view } = payload;
        const submission = viewToSubmission(view, request_type);

        product.createProductRequest(
            slack, jira, submission, user, request_type
        );

        return res;
    },

    configName: function(slack: Slack): string {
        return store.productOptions(slack.id).config_name;
    },

    channel: function(slack: Slack): string {
        return store.productOptions(slack.id).channel_id;
    }
};

export {
    fileShareEventToIssueComment,
    product
};
