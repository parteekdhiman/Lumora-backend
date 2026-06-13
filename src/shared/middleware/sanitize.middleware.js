import xss from 'xss';

/**
 * Unified Sanitization Middleware
 * Compatible with Express 5.x where req objects are read-only.
 * Recursively prevents NoSQL injection and XSS without reassignment.
 */

const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach(item => sanitizeObject(item));
    return;
  }

  // Handle plain objects
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // 1. Prevent NoSQL Injection: Remove malicious keys
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
        continue;
      }

      // 2. Prevent XSS: Sanitize string values
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
      } else {
        // Recursively sanitize nested objects
        sanitizeObject(obj[key]);
      }
    }
  }
};

export const sanitizeMiddleware = (req, res, next) => {
  try {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
  } catch (error) {
    console.error('[Sanitization Error]:', error);
    res.status(400).json({ success: false, message: 'Invalid payload structure' });
  }
};
