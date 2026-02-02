import { getLogger } from '../config/logger.js';

const logger = getLogger();

const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`Error [${status}]: ${message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(status).json({
    success: false,
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export default errorHandler;
