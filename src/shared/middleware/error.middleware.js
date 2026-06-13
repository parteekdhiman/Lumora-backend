export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Log only in development, or log without sensitive details in production
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} >> ${err.stack}`);
  } else {
    // Basic log for production monitoring, no stack trace
    console.error(`[ERROR] ${req.method} ${req.originalUrl} >> ${message}`);
  }

  // Handle specific known errors (like CastError or JWT error) safely
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again.';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Your token has expired. Please log in again.';
    statusCode = 401;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    message = 'Duplicate field value entered.';
    statusCode = 400;
  }

  // Hide detailed errors in production for 500s
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Service temporarily unavailable';
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
