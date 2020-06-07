import winston from 'winston';

const options: winston.LoggerOptions = {
    transports: [
        new winston.transports.File({ filename: 'log/debug.log', level: 'debug' })
    ]
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
