import logger from './logger';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
    logger.debug('Using .env file to supply config environment variables');
    dotenv.config({ path: '.env' });
} else {
    logger.debug('Using .env.example file to supply config environment variables');
    dotenv.config({ path: '.env.example' });  // you can delete this after you create your own .env file!
}
export const ENVIRONMENT = process.env.NODE_ENV;
export const SLACK_API_TOKEN = process.env['SLACK_API_TOKEN'];
export const JIRA_USERNAME = process.env['JIRA_USERNAME'];
export const JIRA_API_TOKEN = process.env['JIRA_API_TOKEN'];
export const JIRA_HOST = process.env['JIRA_HOST'];

export const SESSION_SECRET = process.env['SESSION_SECRET'];

if (!SESSION_SECRET) {
    logger.error('No client secret. Set SESSION_SECRET environment variable.');
    process.exit(1);
}
