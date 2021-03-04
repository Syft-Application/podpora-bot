import supportConfig from '../../src/lib/support_config';
// import feature from '../../src/util/feature';

describe('supportConfig', () => {
    const slack_user = { id: 'foo-user-id', name: 'Joe Doe' };
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
                            labels: ['support']
                        }
                    });
                });
            });

            describe('data', () => {
                const request_type = 'data';
                const submission = {
                    title: 'A',
                    description: 'B',
                    reason: 'some reason'
                };
                const desc = `${submission.description}

Reason and urgency:
some reason

Submitted by: ${slack_user.name}`;

                it('matches expected object', () => {
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                    ).toEqual({
                        fields: {
                            project: { key: 'INTOPS' },
                            summary: 'A',
                            issuetype: { name: 'Data Request' },
                            description: desc,
                            components: [{ name: 'Back-end' }],
                            labels: ['support']
                        },
                        transition: {
                            id: '131',
                            looped: true
                        }
                    });
                });

                it('includes the reason in description', () => {
                    const result = config.issueParams(submission, slack_user, request_type);
                    expect(result.fields.description).toContain('some reason');
                });
            });

            describe('when long title', () => {
                const request_type = 'data';
                const long_title = 'few random words repeated many times'.repeat(10);
                const submission = {
                    title: long_title,
                    description: 'B',
                    reason: ''
                };
                const first_part_of_title = long_title.slice(0, 128);
                const second_part_of_title = long_title.slice(128, -1);
                const desc = `${second_part_of_title}

${submission.description}

Reason and urgency:


Submitted by: ${slack_user.name}`;
                it('slice the title to acceptable length and prepend to description', () => {
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                    ).toEqual({
                        fields: {
                            project: { key: 'INTOPS' },
                            summary: first_part_of_title,
                            issuetype: { name: 'Data Request' },
                            description: desc,
                            components: [{ name: 'Back-end' }],
                            labels: ['support']
                        },
                        transition: {
                            id: '131',
                            looped: true
                        }
                    });
                });

            });
        });

        describe('#messageText(submission, user, request_type)', () => {
            const request_type = 'data';
            const submission = {
                title: 'A',
                description: 'B',
                reason: 'C'
            };
            it('returns a string', () => {
                const result = config.messageText(submission, slack_user, request_type);
                expect(result).toContain('*A*');
                expect(result).toContain('B');
                expect(result).toContain('C');
            });
        });

        describe('#view(key)', () => {
            it('returns json modal definition', () => {
                const result = config.view('bug');

                expect(
                    new Set(Object.keys(result))
                ).toEqual(new Set(['title', 'type', 'blocks', 'submit', 'private_metadata']));
            });
        });

        describe('#commandsHelpText()', () => {
            const expected_text =
                '👋 Need help with support bot?\n\n'
                + '> Submit a request for data:\n>`/support data`\n\n'
                + '> Submit a bug report:\n>`/support bug`';

            it('matches expected text', () => {
                expect(config.commandsHelpText()).toEqual(expected_text);
            });
        });
    });
});
