import { JIRA_API_TOKEN, JIRA_HOST } from './../util/secrets';
import { Client } from 'jira.js';

const jiraClient = new Client({
    host: JIRA_HOST,
    authentication: {
        accessToken: JIRA_API_TOKEN
    }
});

export {
    jiraClient
};
