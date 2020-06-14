import logger from './logger';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
    logger.debug('Using .env file to supply config environment variables');
    dotenv.config({ path: '.env' });
} else if (process.env.NODE_ENV !== 'production') {
    logger.error('No .env file present in non production environment.');
    logger.error('See README.md for development setup instructions.');
    process.exit(1);
}

interface TeamConfig {
    [index: string]: string;

    support_channel_id: string
}

export const SLACK_API_TOKEN = process.env['SLACK_API_TOKEN'];
export const SLACK_TEAMS: { [index: string]: TeamConfig } = JSON.parse(process.env['SLACK_TEAMS']);
export const JIRA_USERNAME = process.env['JIRA_USERNAME'];
export const JIRA_API_TOKEN = process.env['JIRA_API_TOKEN'];
export const JIRA_HOST = process.env['JIRA_HOST'];

export const SESSION_SECRET = process.env['SESSION_SECRET'];

if (!SESSION_SECRET) {
    logger.error('No client secret. Set SESSION_SECRET environment variable.');
    process.exit(1);
}
