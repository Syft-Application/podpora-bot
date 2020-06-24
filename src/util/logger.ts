import winston from 'winston';

const options: winston.LoggerOptions = {
    transports: [
        new winston.transports.File({
            filename: 'log/debug.log',
            level: 'debug',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],
};

const logger = winston.createLogger(options);

if (process.env.NODE_ENV !== 'production' || !!process.env.CONSOLE_LOG) {
    logger.add(
        new winston.transports.Console({
            level: 'silly',
            format: winston.format.simple()
        })
    );
}

export default logger;
