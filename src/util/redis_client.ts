import redis, { RedisClient } from 'redis';
import logger from './logger';
import { REDIS_URI } from './secrets';

let client: RedisClient;

function redis_client(): RedisClient {
    if (typeof client === 'undefined') {
        // TODO: move to secrets.ts ?
        client = redis.createClient(REDIS_URI);
        client.on('error', function(error: Error) {
            logger.error(error);
        });
    }

    return client;
}

export default redis_client;
