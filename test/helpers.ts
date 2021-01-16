import express from 'express';
import fs from 'fs';
import request, * as supertest from 'supertest';

const FIXTURES_BASE_DIR = `${__dirname}/fixtures`;
const loaded_fixtures: { [index: string]: Record<string, unknown> } = {};

export function fixture(name: string): Record<string, unknown> {
    if (!loaded_fixtures.hasOwnProperty(name)) {
        const raw = fs.readFileSync(`${FIXTURES_BASE_DIR}/${name}.json`);
        loaded_fixtures[name] = JSON.parse(raw.toString());
    }

    return loaded_fixtures[name];
}

interface ServiceResponseCallback {
    (body: Record<string, unknown>): void;
}

export function merge<T>(
    target: T,
    source: Record<string, unknown>
): T {
    const target_copy = Object.assign({}, target);

    return Object.assign(target_copy, source);
}

export function build_service<T>(app: express.Application, api_path: string) {
    return function(params: T): supertest.Test {
        return request(app).post(api_path).send(params as unknown as Record<string, unknown>);
    };
}

export function build_response(service: supertest.Test) {
    return function(callback: ServiceResponseCallback, onError: jest.DoneCallback): supertest.Test {
        // return service.end((err: any, res: Record<string, unknown>) => {
        return service.end((err: Error, res: supertest.Response) => {
            if (err) {
                onError(err);
            }

            return callback(res.body);
        });
    };
}
