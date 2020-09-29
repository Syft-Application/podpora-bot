import supportConfig from '../../src/lib/support_config';

describe('supportConfig', () => {
    const slack_user = { id: 'foo', name: 'Joe Doe' };
    describe('default', () => {
        const config = supportConfig('default');
        it('exists', () => {
            expect(config).toBeDefined();
        });
    });

    describe('syft', () => {
        const config = supportConfig('syft');
        it('exists', () => {
            expect(config).toBeDefined();
        });

        describe('#issueParams(submission, slack_user, request_type)', () => {
            describe('bug', () => {
                const request_type = 'bug';
                const submission = {
                    title: 'A',
                    description: 'B',
                    currently: 'C',
                    expected: 'D'
                };
                const desc = `${submission.description}

Currently:
${submission.currently}

Expected:
${submission.expected}

Submitted by: ${slack_user.name}`;

                it('matches expected object', () => {
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                    ).toEqual({
                        fields: {
                            project: { key: 'SUP' },
                            summary: 'A',
                            issuetype: { name: 'Bug' },
                            description: desc,
                        }
                    });
                });
            });

            describe('data', () => {
                const request_type = 'data';
                const submission = {
                    title: 'A',
                    description: 'B'
                };
                const desc = `${submission.description}

Submitted by: ${slack_user.name}`;

                it('matches expected object', () => {
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                    ).toEqual({
                        fields: {
                            project: { key: 'SUP' },
                            summary: 'A',
                            issuetype: { name: 'Data Request' },
                            description: desc,
                        }
                    });
                });
            });

            describe('idea', () => {
                const request_type = 'idea';
                const submission = {
                    title: 'A',
                    description: 'B'
                };
                const desc = `${submission.description}

Submitted by: ${slack_user.name}`;

                it('matches expected object', () => {
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                    ).toEqual({
                        fields: {
                            project: { key: 'MLA' },
                            summary: 'A',
                            issuetype: { name: 'Epic' },
                            description: desc,
                        }
                    });
                });
            });
        });

        describe('#supportMessageText(submission, user, request_type)', () => {
            const request_type = 'data';
            const submission = {
                title: 'A',
                description: 'B'
            };
            it('returns a string', () => {
                const result = config.supportMessageText(submission, slack_user, request_type);
                expect(result).toContain('*A*');
                expect(result).toContain('B');
            });
        });
    });
});
