import { SLACK_API_TOKEN, SLACK_TEAMS } from './../util/secrets';
import { WebClient } from '@slack/web-api';
import logger from '../util/logger';

function teamConfig(team_id: string): Record<string, string> {
    return SLACK_TEAMS[team_id];
}

interface TeamApiObject {
    id: string,
    domain: string
}

declare class SlackTeam {
    constructor(team: TeamApiObject);

    postSupportRequest: () => void;
}

function SlackTeam(team: TeamApiObject): void {
    logger.debug(team);
    this.id = team.id;
    this.domain = team.domain;
    this.config = teamConfig(this.id);
    // TODO: api token should be per team
    this.client = new WebClient(SLACK_API_TOKEN);
}

SlackTeam.prototype = {
    // buildSupportRequest: (): void => {
    // },
    postSupportRequest: (): void => {
        logger.info('todo');
    }
};

export default SlackTeam;
