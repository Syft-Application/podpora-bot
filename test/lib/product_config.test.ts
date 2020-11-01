import productConfig from '../../src/lib/product_config';

describe('productConfig', () => {
    const slack_user = { id: 'foo', name: 'Joe Doe' };
    describe('default', () => {
        const config = productConfig('default');
        it('exists', () => {
            expect(config).toBeDefined();
        });

        describe('#issueParams(submission, slack_user, request_type)', () => {
            describe('idea', () => {
                const request_type = 'idea';
                const submission = {
                    title: 'A',
                    description: 'B',
                    affected_users: 'C',
                    urgency: 'D',
                    product_area: 'E'
                };
                const desc = `${submission.description}

Affected Users: ${submission.affected_users}
Product Area: ${submission.product_area}
Urgency: ${submission.urgency}

Submitted by: ${slack_user.name}`;

                it('matches expected object', () => {
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                    ).toEqual({
                        fields: {
                            project: { key: 'IDEA' },
                            summary: 'A',
                            issuetype: { name: 'Idea' },
                            description: desc,
                            labels: ['product',
                                     submission.urgency.toLowerCase(),
                                     submission.product_area.toLowerCase()]
                        }
                    });
                });

                it('does not include empty urgency as label', () => {
                    const submission = {
                        title: 'A',
                        description: 'B',
                        affected_users: 'C',
                        product_area: 'D'
                    };
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                            .fields.labels
                    ).toEqual(['product', 'd']);
                });

                it('does not include empty product_area as label', () => {
                    const submission = {
                        title: 'A',
                        description: 'B',
                        affected_users: 'C',
                        urgency: 'X'
                    };
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                            .fields.labels
                    ).toEqual(['product', 'x']);
                });

                it('normalises text to be used as label', () => {
                    const submission = {
                        title: 'A',
                        description: 'B',
                        affected_users: 'C',
                        urgency: 'Bony & Clyde (foo - bar)',
                        product_area: 'Upcase / Downcase ^ sna_ke'
                    };
                    expect(
                        config.issueParams(submission, slack_user, request_type)
                            .fields.labels
                    ).toEqual(['product',
                               'bony-and-clyde-foo-bar',
                               'upcase-downcase-sna-ke']);
                });

            });
        });

        describe('#productMessageText(submission, user, request_type)', () => {
            const request_type = 'idea';
            const submission = {
                title: 'A',
                description: 'B',
                urgency: 'C',
                product_area: 'D',
                affected_users: 'E'
            };
            it('returns a string', () => {
                const result = config.productMessageText(submission, slack_user, request_type);
                expect(result).toContain('*A*');
                expect(result).toContain('B');
                expect(result).toContain('C');
                expect(result).toContain('D');
                expect(result).toContain('E');
            });
        });
    });
});
