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
                    impact: 'C',
                    urgency: 'D',
                    product_area: 'E'
                };
                const desc = `${submission.description}

Impact:
${submission.impact}

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
                            labels: ['product']
                        }
                    });
                });
            });
        });

        describe('#productMessageText(submission, user, request_type)', () => {
            const request_type = 'idea';
            const submission = {
                title: 'A',
                description: 'B',
                urgency: 'C',
                product_area: 'D'
            };
            it('returns a string', () => {
                const result = config.productMessageText(submission, slack_user, request_type);
                expect(result).toContain('*A*');
                expect(result).toContain('B');
                expect(result).toContain('C');
                expect(result).toContain('D');
            });
        });
    });
});
