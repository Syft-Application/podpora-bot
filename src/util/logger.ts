import winston from 'winston';

const options: winston.LoggerOptions = {
    transports: [
        new winston.transports.File({
            filename: 'log/debug.log',
            level: 'debug'
        })
    ],
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
};

const logger = winston.createLogger(options);

if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple()
        })
    );
}

export default logger;
