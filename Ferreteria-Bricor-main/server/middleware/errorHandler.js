/**
 * Middleware centralizado de manejo de errores
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  const statusCode = err.statusCode || (err.message.includes('insuficiente') || err.message.includes('obligatorio') ? 400 : 500);

  res.status(statusCode).json({
    success: false,
    error: err.name || 'API_ERROR',
    message: err.message || 'Error interno del servidor.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
