import {
    SlackUser
} from '../slack_team';

import {
    BugSubmission,
    DataSubmission,
    Submission,
} from '../support';

function bugReportMessageText(
    submission: BugSubmission,
    user: SlackUser
): string {
    return `<@${user.id}> has submitted a bug report:\n\n` +
        `*${submission.title}*\n\n` +
        `*Steps to Reproduce*\n\n${submission.description}\n\n` +
        `*Currently*\n\n${submission.currently}\n\n` +
        `*Expected*\n\n${submission.expected}`;
}

function dataRequestMessageText(
    submission: DataSubmission,
    user: SlackUser
): string {
    return `<@${user.id}> has submitted a data request:\n\n` +
        `*${submission.title}*\n\n${submission.description}`;
}

function supportMessageText(
    submission: Submission,
    user: SlackUser,
    request_type: string
): string {
    if (request_type === 'bug') {
        return bugReportMessageText(submission as BugSubmission, user);
    } else {
        return dataRequestMessageText(submission as DataSubmission, user);
    }
}

export default supportMessageText;
