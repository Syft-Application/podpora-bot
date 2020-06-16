import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { fixture } from '../helpers';

import * as jira from '../../src/lib/jira';

const createIssueResponse = fixture('jira/issues.createIssue.response');
const loggerSpy = jest.spyOn(logger, 'error').mockReturnValue(({} as unknown) as Logger);

const jiraCreateIssueMock = jest.spyOn(jira.client.issues, 'createIssue');
const bug_report = {
    id: '1592066203.000100',
    team: {
        id: 'THS7JQ2RL',
        domain: 'supportdemo'
    },
    user: {
        id: 'UHAV00MD0',
        name: 'sherlock_holmes'
    },
    type: 'bug',
    submission: {
        title: 'bug report title'
    }
};
const data_request = {
    id: '1592066203.000200',
    team: {
        id: 'THS7JQ2RL',
        domain: 'supportdemo'
    },
    user: {
        id: 'UHAV00MD1',
        name: 'john_watson'
    },
    type: 'data',
    submission: {
        title: 'data request title'
    }
};

afterEach(() => {
    jest.clearAllMocks();
});

describe('Jira', () => {
    describe('#createIssue()', () => {
        const createIssue = jira.createIssue;

        it('returns a Promise', () => {
            jiraCreateIssueMock.mockImplementation(() => {
                return Promise.resolve(createIssueResponse);
            });

            expect(createIssue(bug_report)).toBeInstanceOf(Promise);
            const fields = jiraCreateIssueMock.mock.calls[0][0].fields;
            expect(fields.summary).toEqual(bug_report.submission.title);
            expect(fields.issuetype.name).toEqual('bug');
            expect(fields.project.key).toEqual('SUP');

            expect(createIssue(bug_report))
                .resolves.toEqual(createIssueResponse);
        });

        describe('failure', () => {
            it('it catch and log the failure', () => {
                jiraCreateIssueMock.mockImplementation(() => {
                    return Promise.reject({ ok: false });
                });

                expect(createIssue(bug_report)).rejects.toEqual({ ok: false });

                createIssue(bug_report)
                    .catch(() => {
                        expect(loggerSpy).toHaveBeenCalled();
                    });
            });
        });

        describe('data request', () => {
            it('changes issuetype to data', () => {
                jiraCreateIssueMock.mockImplementation(() => {
                    return Promise.resolve(createIssueResponse);
                });

                createIssue(data_request);
                const fields = jiraCreateIssueMock.mock.calls[0][0].fields;
                expect(fields.summary).toEqual(data_request.submission.title);
                expect(fields.issuetype.name).toEqual('data');
                expect(fields.project.key).toEqual('SUP');
            });
        });
    });
});
