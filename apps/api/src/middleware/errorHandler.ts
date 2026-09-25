import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/AppError";
import { isProduction } from "../env";

/** Every response body on an error path has this shape. */
export interface ErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    error: `No route for ${req.method} ${req.path}`,
    code: "not_found",
  };
  res.status(404).json(body);
};

/**
 * Must be registered last. Express identifies an error handler by its arity, so
 * all four parameters are required even though `next` is unused.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    // The response is already on the wire; handing it to Express is the only
    // correct move left.
    next(err);
    return;
  }

  if (err instanceof AppError) {
    const body: ErrorBody = { error: err.message, code: err.code };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.status).json(body);
    return;
  }

  // Anything else is a bug. Log it in full, tell the client nothing.
  console.error("Unhandled error:", err);

  const body: ErrorBody = {
    error: "Something went wrong on our side.",
    code: "internal_error",
  };
  if (!isProduction && err instanceof Error) {
    body.details = { message: err.message, stack: err.stack };
  }
  res.status(500).json(body);
};
