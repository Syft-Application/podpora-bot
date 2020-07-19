import nock from 'nock';
import { build_service, build_response } from '../helpers';
import app from '../../src/app';

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
});
