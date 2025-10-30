import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Environment-based configuration
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR || './logs';

// Sensitive fields to redact
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'accessToken', 'refreshToken'];

// Redact sensitive data from objects
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// Custom format for structured JSON logging (Kibana/Grafana ready)
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const logEntry: any = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
    };

    // Add optional fields if present
    if (info.userId) logEntry.userId = info.userId;
    if (info.method) logEntry.method = info.method;
    if (info.uri) logEntry.uri = info.uri;
    if (info.status) logEntry.status = info.status;
    if (info.elapsedMs !== undefined) logEntry.elapsedMs = info.elapsedMs;

    // Add request/response body only for errors (4xx/5xx)
    if (info.status && (info.status >= 400)) {
      if (info.requestBody) {
        logEntry.requestBody = redactSensitiveData(info.requestBody);
      }
      if (info.responseBody) {
        logEntry.responseBody = redactSensitiveData(info.responseBody);
      }
    }

    // Add error details if present
    if (info.error) {
      logEntry.error = {
        name: info.error.name,
        message: info.error.message,
        stack: info.error.stack,
      };
    }

    return JSON.stringify(logEntry);
  })
);

// Console format for docker logs (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    let message = `${info.timestamp} [${info.level}]`;

    if (info.method && info.uri) {
      message += ` ${info.method} ${info.uri}`;
    }

    if (info.status) {
      message += ` - ${info.status}`;
    }

    if (info.elapsedMs !== undefined) {
      message += ` (${info.elapsedMs}ms)`;
    }

    if (info.userId) {
      message += ` [user:${info.userId}]`;
    }

    message += ` - ${info.message}`;

    if (info.error && info.error.stack) {
      message += `\n${info.error.stack}`;
    }

    return message;
  })
);

// Transport: Console (for docker logs command)
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: LOG_LEVEL,
});

// Transport: General logs file (all requests)
const fileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, '%DATE%.log'),
  datePattern: 'YYYYMMDD',
  maxSize: '10m', // 10 MB
  maxFiles: '30d', // Keep logs for 30 days
  format: jsonFormat,
  level: LOG_LEVEL,
  auditFile: path.join(LOG_DIR, 'audit.json'),
});

// Transport: Error logs file (4xx/5xx only with full details)
const errorFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYYMMDD',
  maxSize: '10m', // 10 MB
  maxFiles: '30d', // Keep error logs for 30 days
  format: jsonFormat,
  level: 'error',
  auditFile: path.join(LOG_DIR, 'error-audit.json'),
});

// Create Winston logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    consoleTransport,
    fileTransport,
    errorFileTransport,
  ],
  exitOnError: false,
});

// Log interface for API requests
export interface ApiLogData {
  userId?: string;
  method: string;
  uri: string;
  status: number;
  elapsedMs: number;
  message?: string;
  requestBody?: any;
  responseBody?: any;
  error?: Error;
}

// Convenience function for API logging
export function logApiRequest(data: ApiLogData) {
  const level = data.status >= 500 ? 'error' : data.status >= 400 ? 'warn' : 'info';

  // Log to Winston (file + console)
  logger.log({
    level,
    message: data.message || 'API Request',
    userId: data.userId,
    method: data.method,
    uri: data.uri,
    status: data.status,
    elapsedMs: data.elapsedMs,
    requestBody: data.requestBody,
    responseBody: data.responseBody,
    error: data.error,
  });

  // Also log to PostgreSQL for Grafana (if configured)
  if (process.env.MONITORING_DB_URL) {
    // Dynamic import to avoid errors if pg module not installed
    import('./postgres-logger').then(({ logToPostgres }) => {
      logToPostgres({
        timestamp: new Date(),
        level,
        message: data.message || 'API Request',
        userId: data.userId,
        method: data.method,
        uri: data.uri,
        status: data.status,
        elapsedMs: data.elapsedMs,
        requestBody: data.requestBody,
        responseBody: data.responseBody,
        errorMessage: data.error?.message,
        errorStack: data.error?.stack,
      });
    }).catch(err => {
      // Silently fail if PostgreSQL logging not available
      console.warn('PostgreSQL logging not available:', err.message);
    });
  }
}

// Export logger for custom usage
export default logger;

// Log initialization message
logger.info('Logger initialized', {
  level: LOG_LEVEL,
  logDir: LOG_DIR,
  nodeEnv: process.env.NODE_ENV,
});
