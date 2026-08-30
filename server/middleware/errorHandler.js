/**
 * Global Express Error Handling Middleware.
 * Standardizes all unhandled server errors and suppresses stack traces in production.
 */
export function globalErrorHandler(err, req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Interner Serverfehler.';
  const code = err.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    process.stderr.write('[API Server Error] Internal server error occurred\n');
  }

  res.status(statusCode).json({
    error:
      statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? 'Ein interner Serverfehler ist aufgetreten.'
        : message,
    code,
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}
