// Custom error class
export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Error handler for async functions
export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        // Development error response
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production error response
        if (err.isOperational) {
            // Operational, trusted error: send message to client
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            // Programming or other unknown error: don't leak error details
            console.error('ERROR 💥', err);
            res.status(500).json({
                status: 'error',
                message: 'Something went wrong!'
            });
        }
    }
};

// Handle specific SQL errors
export const handlePostgresError = (err) => {
  // Duplicate key (unique constraint violation)
  if (err.code === "23505") {
    const detail = err.detail || "Duplicate field value";
    return new AppError(`Duplicate value error: ${detail}`, 400);
  }

  // Foreign key violation
  if (err.code === "23503") {
    return new AppError(`Invalid reference: ${err.detail}`, 400);
  }

  // Not-null violation
  if (err.code === "23502") {
    return new AppError(`Missing required field: ${err.column}`, 400);
  }

  // Check constraint violation
  if (err.code === "23514") {
    return new AppError(`Check constraint failed: ${err.detail}`, 400);
  }

  // Syntax error in SQL
  if (err.code === "42601") {
    return new AppError(`Syntax error in SQL query`, 500);
  }

  // Invalid text representation (e.g. invalid UUID format)
  if (err.code === "22P02") {
    return new AppError(`Invalid input format: ${err.message}`, 400);
  }

  // Default fallback
  return err;
};
