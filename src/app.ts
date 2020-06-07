import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import logger from './util/logger';

// Controllers (route handlers)
import * as homeController from './controllers/home';
import * as apiController from './controllers/api';
import * as apiSlackController from './controllers/api/slack';

// Create Express server
const app = express();

// Express configuration
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get('/', homeController.index);

/**
 * API routes.
 */
app.get('/api', apiController.getApi);
app.post('/api/slack/command', apiSlackController.postCommand);
app.post('/api/slack/event', apiSlackController.postEvent);

export default app;
