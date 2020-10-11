import {
    ChannelThreadFileShareEvent,
    SlackFiles,
    isSlackImageFile,
    ViewSubmission,
    ViewSubmissionInputValue
} from './slack/api_interfaces';

function fileShareEventToIssueComment(
    event: ChannelThreadFileShareEvent,
    url: string,
    user_name: string
): string {
    const files_str = event.files.map(slackFileToText).join('\n\n');

    return `${user_name}: ${event.text}\n\n${files_str}\n \n${url}\n`;
}

interface SlackCommand {
    name: string,
    desc: string,
    example: string
}

function commandsNames(commands: Array<SlackCommand>): Array<string> {
    return commands.map((cmd) => { return cmd.name; });
}

// Unfortunaly preview slack images does not work as explained here:
// https://community.atlassian.com/t5/Jira-Questions/ \
// How-to-embed-images-by-URL-in-new-Markdown-Jira-editor/qaq-p/1126329
// > in the New editor and the editing view used in Next-gen Projects,
// > is moving away from using wiki style markup to a WYSIWYG editing approach,
// if (isSlackImageFile(file)) {
//     f = `!${file.url_private}!\n` +
//         `[Download](${file.url_private_download}) or ` +
//         `[See on Slack](${file.permalink})`;
// } else {
// }
function slackFileToText(file: SlackFiles): string {
    if (isSlackImageFile(file)) {
        return `${file.name}\n` +
            `Preview: ${file.thumb_360}\n` +
            `Show: ${file.url_private}\n` +
            `Download: ${file.url_private_download}`;
    } else {
        return `${file.name}\n` +
            `Download: ${file.url_private_download}`;
    }
}

function viewInputVals(
    id: string,
    values: ViewSubmission['view']['state']['values']
): string {
    const input = values[id + '_block'][id] as ViewSubmissionInputValue;
    return input.value;
}

export {
    commandsNames,
    fileShareEventToIssueComment,
    SlackCommand,
    slackFileToText,
    viewInputVals
};
