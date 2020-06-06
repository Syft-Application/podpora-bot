'use strict';

import { Response, Request, NextFunction } from 'express';
import logger from '../util/logger';

/**
 * GET /api
 *
 */
export const getApi = (req: Request, res: Response) => {
    res.json({ version: '1.0.0' });
};

/**
 * POST /api/slack/command
 *
 */
export const postApiSlackCommand = (req: Request, res: Response) => {
    res.json({ text: 'Unknown or missing command' });
};

/**
 * POST /api/slack/event
 *
 */
export const postApiSlackEvent = (req: Request, res: Response) => {
    res.json({ hello: 'world' });
};
