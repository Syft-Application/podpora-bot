import {
    statusChangeMessage
} from '../../src/lib/slack_jira_helpers';

afterEach(() => {
    jest.clearAllMocks();
});

describe('statusChangeMessage(issue, changelog)', () => {
    const issue = {
        id: '10057',
        self: 'https://example.atlassian.net/rest/api/2/10057',
        key: 'SUP-58',
        fields: {
            summary: 'not important',
            attachment: [],
            issuelinks: []
        }
    };
    describe('move from Done to active state', () => {
        const changelog = {
            id: '10143',
            items: [
                {
                    field: 'resolution',
                    fieldtype: 'jira',
                    fieldId: 'resolution',
                    from: null,
                    fromString: 'Duplicate',
                    to: '10000',
                    toString: null
                },
                {
                    field: 'status',
                    fieldtype: 'jira',
                    fieldId: 'status',
                    from: '10001',
                    fromString: 'Done',
                    to: '10002',
                    toString: 'In Progress'
                }
            ]
        };

        it('does not include the resolution in Slack message', () => {
            const msg = statusChangeMessage(issue, changelog);

            expect(msg).toContain('Status changed from');
            expect(msg).toContain('Done');
            expect(msg).toContain('In Progress');
            expect(msg).not.toContain('null');
        });
    });
});
