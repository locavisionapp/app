// Wraps an async Express handler so a rejected promise reaches the error
// middleware instead of crashing the function or hanging the request
// (Express 4 does not catch async errors on its own).
function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

// User-facing error with a safe, expose-able message (e.g. 404 "Vehicle not
// found"). Anything thrown without `expose: true` is logged but replaced by
// a generic message before it reaches the client.
class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.expose = true
  }
}

module.exports = { asyncRoute, ApiError }
