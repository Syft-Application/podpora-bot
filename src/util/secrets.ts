import logger from './logger';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
    if (process.env.NODE_ENV !== 'test') {
        logger.debug('Using .env file to supply config environment variables');
    }
    dotenv.config({ path: '.env' });
} else if (process.env.NODE_ENV !== 'production') {
    logger.error('No .env file present in non production environment.');
    logger.error('See README.md for development setup instructions.');
    process.exit(1);
}

export interface TeamConfig {
    [index: string]: string;

    api_token: string,
    support_channel_id: string
}

export interface JiraConfig {
    [index: string]: string;

    username: string,
    api_token: string,
    host: string
}

const SLACK_TEAMS: { [index: string]: TeamConfig } = JSON.parse(process.env['SLACK_TEAMS']);
const JIRA_CONFIGS: { [index: string]: JiraConfig } = JSON.parse(process.env['JIRA_CONFIGS']);

const store = {
    slackTeamConfig: (id: string): TeamConfig => {
        return SLACK_TEAMS[id];
    },
    jiraConfig: (id: string): JiraConfig => {
        return JIRA_CONFIGS[id];
    }
};


export const SESSION_SECRET = process.env['SESSION_SECRET'];

if (!SESSION_SECRET) {
    logger.error('No client secret. Set SESSION_SECRET environment variable.');
    process.exit(1);
}

export { store };
