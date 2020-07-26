import logger from './logger';
import dotenv from 'dotenv';
import fs from 'fs';
import redis, { RedisClient } from 'redis';

if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.example' });
} else if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
    logger.debug('Using .env file to supply config environment variables');
} else if (process.env.NODE_ENV !== 'production') {
    logger.error('No .env file present in non production environment.');
    logger.error('See README.md for development setup instructions.');
    process.exit(1);
}

export interface SlackOptions {
    [index: string]: string;

    id: string,
    api_token: string,
    domain: string,
}

export interface JiraOptions {
    [index: string]: string;

    username: string,
    api_token: string,
    host: string
}

export interface SupportOptions {
    [index: string]: string;
    channel_id: string
    config_name: string
}

const SLACK_OPTIONS: { [index: string]: SlackOptions }
    = JSON.parse(process.env['SLACK_OPTIONS'] as string);
const JIRA_OPTIONS: { [index: string]: JiraOptions }
    = JSON.parse(process.env['JIRA_OPTIONS'] as string);
const SUPPORT_OPTIONS: { [index: string]: SupportOptions }
    = JSON.parse(process.env['SUPPORT_OPTIONS'] as string);

let client: RedisClient;

function redis_client(): RedisClient {
    if (typeof client === 'undefined') {
        // TODO: move to secrets.ts ?
        client = redis.createClient(REDIS_URL);

        client.on('error', function(error: Error) {
            logger.error(error);
        });
    }

    return client;
}

const store = {
    slackOptions: (id: string): SlackOptions => {
        return SLACK_OPTIONS[id];
    },
    jiraOptions: (id: string): JiraOptions => {
        return JIRA_OPTIONS[id];
    },
    supportOptions: (id: string): SupportOptions => {
        return SUPPORT_OPTIONS[id];
    },

    set: (...args: string[]): boolean => {
        return redis_client().mset(args);
    },

    get: (key: string): Promise<string | null> => {
        return new Promise((resolve, reject) => {
            redis_client().get(key, (error, response) => {
                if (error) {
                    return reject(error);
                }

                return resolve(response);
            });
        });
    }
};

export const SESSION_SECRET = process.env['SESSION_SECRET'];

if (!SESSION_SECRET) {
    logger.error('No client secret. Set SESSION_SECRET environment variable.');
    process.exit(1);
}

const REDIS_URL = process.env.REDIS_URL as string;

export { store, REDIS_URL };
