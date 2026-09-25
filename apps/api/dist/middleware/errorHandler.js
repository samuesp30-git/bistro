"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const AppError_1 = require("../lib/AppError");
const env_1 = require("../env");
const notFoundHandler = (req, res) => {
    const body = {
        error: `No route for ${req.method} ${req.path}`,
        code: "not_found",
    };
    res.status(404).json(body);
};
exports.notFoundHandler = notFoundHandler;
/**
 * Must be registered last. Express identifies an error handler by its arity, so
 * all four parameters are required even though `next` is unused.
 */
const errorHandler = (err, _req, res, next) => {
    if (res.headersSent) {
        // The response is already on the wire; handing it to Express is the only
        // correct move left.
        next(err);
        return;
    }
    if (err instanceof AppError_1.AppError) {
        const body = { error: err.message, code: err.code };
        if (err.details !== undefined)
            body.details = err.details;
        res.status(err.status).json(body);
        return;
    }
    // Anything else is a bug. Log it in full, tell the client nothing.
    console.error("Unhandled error:", err);
    const body = {
        error: "Something went wrong on our side.",
        code: "internal_error",
    };
    if (!env_1.isProduction && err instanceof Error) {
        body.details = { message: err.message, stack: err.stack };
    }
    res.status(500).json(body);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map