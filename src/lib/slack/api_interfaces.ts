interface PostCommandPayload {
    token: string
    team_id: string
    team_domain: string
    enterprise_id: string
    enterprise_name: string
    channel_id: string
    channel_name: string
    user_id: string
    user_name: string
    command: string
    text: string
    response_url: string
    trigger_id: string
}

const enum InteractionTypes {
    dialog_submission = 'dialog_submission'
}

interface PostInteractionPayload {
    type: InteractionTypes,
    token: string,
    action_ts: string,
    team: {
        id: string,
        domain: string
    },
    user: {
        id: string,
        name: string
    },
    channel: {
        id: string,
        name: string
    },
    submission: {
        title: string,
        description: string
        currently: string,
        expected: string
    },
    callback_id: string,
    response_url: string,
    state: string
}

interface PostEventUrlVerificationPayload {
    [index: string]: string
    token: string
    challenge: string
    type: string
}

function isUrlVerification(
    payload: PostEventPayloads
): payload is PostEventUrlVerificationPayload {
    return (<PostEventUrlVerificationPayload>payload).type === 'url_verification';
}

type PostEventPayloads = PostEventUrlVerificationPayload | EventCallbackPayload;

interface EventCallbackPayload {
    [index: string]: string | ChannelEvents
    token: string,
    type: string,
    team_id: string,
    event: ChannelEvents
}

interface ChannelEvent {
    [index: string]: string | Array<SlackFile> | undefined
    ts: string,
    type: string,
    team?: string,
    channel: string,
}

interface ChannelThreadEvent extends ChannelEvent {
    thread_ts: string,
    text: string,
}

interface ChannelThreadFileShareEvent extends ChannelThreadEvent {
    subtype: string
    files: Array<SlackFile>,
    user: string
}

type ChannelEvents = ChannelThreadFileShareEvent | ChannelThreadEvent | ChannelEvent;

function isChannelThreadEvent(event: ChannelEvents): event is ChannelThreadEvent {
    return (<ChannelThreadEvent>event).thread_ts !== undefined;
}

function isChannelThreadFileShareEvent(
    event: ChannelEvents
): event is ChannelThreadFileShareEvent {
    return isChannelThreadEvent(event) &&
        (<ChannelThreadFileShareEvent>event).subtype === 'file_share';
}

interface SlackFile {
    id: string
    name: string
    mimetype: string
    filetype: string
    url_private: string
    url_private_download: string
    thumb_360?: string
    permalink: string
}

interface SlackImageFile extends SlackFile {
    thumb_360: string
}

type SlackFiles = SlackImageFile | SlackFile;

function isSlackImageFile(
    file: SlackFiles
): file is SlackImageFile {
    return (<SlackImageFile>file).thumb_360 !== undefined;
}

interface SlackUser { id: string, name: string }

interface Submission {
    [index: string]: string;
}

export {
    PostCommandPayload,
    InteractionTypes,
    PostInteractionPayload,
    PostEventPayloads,
    isUrlVerification,
    EventCallbackPayload,
    ChannelThreadEvent,
    ChannelThreadFileShareEvent,
    isChannelThreadEvent,
    isChannelThreadFileShareEvent,
    isSlackImageFile,
    SlackFiles,
    SlackUser,
    Submission
};
