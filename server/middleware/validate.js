import { ZodError } from 'zod';

/**
 * Express middleware for validating request body against a Zod schema.
 * Formats validation errors into a standardized response contract.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return res.status(400).json({
          error: issues[0]?.message || 'Ungültige Eingabedaten.',
          code: 'VALIDATION_ERROR',
          details: issues,
        });
      }
      next(err);
    }
  };
}

/**
 * Express middleware for validating request query parameters against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return res.status(400).json({
          error: issues[0]?.message || 'Ungültige Abfrageparameter.',
          code: 'VALIDATION_ERROR',
          details: issues,
        });
      }
      next(err);
    }
  };
}
