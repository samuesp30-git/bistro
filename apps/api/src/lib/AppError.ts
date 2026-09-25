/**
 * An error the client is allowed to see. Anything thrown that is not an
 * AppError is treated as a bug and reported as a bare 500, so an internal
 * message or a stack trace never reaches a response body.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    options: { code?: string; details?: unknown } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = options.code ?? defaultCode(status);
    this.details = options.details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, { code: "bad_request", details });
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(401, message, { code: "unauthorized" });
  }

  static forbidden(message = "Not allowed") {
    return new AppError(403, message, { code: "forbidden" });
  }

  static notFound(message = "Not found") {
    return new AppError(404, message, { code: "not_found" });
  }

  /** Used when the request is well formed but the world disagrees, e.g. sold out. */
  static conflict(message: string, details?: unknown) {
    return new AppError(409, message, { code: "conflict", details });
  }

  static unavailable(message: string) {
    return new AppError(503, message, { code: "unavailable" });
  }
}

function defaultCode(status: number): string {
  if (status >= 500) return "internal_error";
  if (status >= 400) return "request_error";
  return "error";
}
