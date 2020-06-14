import { SLACK_API_TOKEN, SLACK_TEAMS } from './../util/secrets';
import { WebClient, WebAPICallResult } from '@slack/web-api';
import logger from '../util/logger';

interface TeamApiObject {
    id: string,
    domain: string
}

interface TeamConfig {
    [index: string]: string;

    support_channel_id: string
}

function teamConfig(team_id: string): TeamConfig {
    // return (<TeamConfig>SLACK_TEAMS[team_id]);
    // return (SLACK_TEAMS[team_id] as TeamConfig);
    return SLACK_TEAMS[team_id];
}

class SlackTeam {
    constructor(team: TeamApiObject) {
        logger.debug(team);
        this.id = team.id;
        this.domain = team.domain;
        this.config = teamConfig(this.id);
        // TODO: api token should be per team
        this.client = new WebClient(SLACK_API_TOKEN);
    }

    id: string;
    domain: string;
    client: WebClient;
    config: TeamConfig;

    postSupportRequest(): Promise<WebAPICallResult | void> {
        return this.client.chat.postMessage({
            text: 'some text',
            channel: 'this.config.support_channel_id'
        }).catch((error) => {
            logger.debug(error);
            return Promise.reject({ ok: false });
        });
    }
}

export default SlackTeam;
