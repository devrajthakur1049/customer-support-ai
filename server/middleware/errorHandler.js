// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error('[errorHandler]', err);

  // Never leak internals (stack traces, credentials, connection strings).
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error. Please try again.' : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
