// 404 handler
function notFound(req, res, _next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

// Generic error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = { notFound, errorHandler };
