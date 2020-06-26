import { Request, Response } from 'express';

/**
 * GET /
 * Home page.
 */
export const index = (_: Request, res: Response): void => {
    res.send('home sweet home');
};
