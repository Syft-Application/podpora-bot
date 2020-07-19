import nock from 'nock';
import { Logger } from 'winston';
import logger from '../../src/util/logger';
import { build_service, build_response } from '../helpers';
import app from '../../src/app';

const logInfoSpy = jest.spyOn(logger, 'info').mockReturnValue({} as Logger);

beforeAll(() => {
    return nock.enableNetConnect(/localhost|127\.0\.0\.1/);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/jira/event', () => {
    const api_path = '/api/jira/event';
    const service = build_service(app, api_path);
    const default_params = {};
    const response = build_response(service(default_params));

    it('returns 200 OK', () => {
        return service(default_params).expect(200);
    });

    it('returns empty', (done) => {
        response((body: Record<string, unknown>) => {
            expect(body).toEqual({});
            done();
        }, done);
    });

    describe('webhookEvent: jira:issue_updated', () => {
        const params = { webhookEvent: 'jira:issue_updated' };
        describe('status_change', () => {
            // text: `Jira ticket status changed from *${changed_from}* to *${changed_to}*`,
            it('logs the payload', (done) => {
                expect.assertions(2);
                service(params).expect(200).end((err) => {
                    if (err) {
                        return done(err);
                    }
                    expect(logInfoSpy).toHaveBeenCalled();
                    const log_args = JSON.stringify(logInfoSpy.mock.calls[0]);
                    expect(log_args).toContain('jiraPostEvent');
                    done();
                });
            });
        });
    });
});
