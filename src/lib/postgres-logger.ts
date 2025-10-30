import { Pool } from 'pg';

// PostgreSQL connection pool for monitoring database
const monitoringPool = new Pool({
  connectionString: process.env.MONITORING_DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log buffer for batch inserts (performance optimization)
interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  userId?: string;
  method?: string;
  uri?: string;
  status?: number;
  elapsedMs?: number;
  requestBody?: any;
  responseBody?: any;
  errorMessage?: string;
  errorStack?: string;
  ipAddress?: string;
  userAgent?: string;
}

const logBuffer: LogEntry[] = [];
const BUFFER_SIZE = 100;
const FLUSH_INTERVAL = 10000; // 10 seconds

// Flush logs to database
async function flushLogs() {
  if (logBuffer.length === 0) return;

  const logsToInsert = logBuffer.splice(0, logBuffer.length);

  try {
    const query = `
      INSERT INTO app_logs (
        timestamp, level, message, user_id, method, uri, status, elapsed_ms,
        request_body, response_body, error_message, error_stack, ip_address, user_agent
      )
      VALUES ${logsToInsert.map((_, i) =>
        `($${i * 14 + 1}, $${i * 14 + 2}, $${i * 14 + 3}, $${i * 14 + 4}, $${i * 14 + 5}, $${i * 14 + 6}, $${i * 14 + 7}, $${i * 14 + 8}, $${i * 14 + 9}, $${i * 14 + 10}, $${i * 14 + 11}, $${i * 14 + 12}, $${i * 14 + 13}, $${i * 14 + 14})`
      ).join(', ')}
    `;

    const values = logsToInsert.flatMap(log => [
      log.timestamp,
      log.level,
      log.message,
      log.userId || null,
      log.method || null,
      log.uri || null,
      log.status || null,
      log.elapsedMs || null,
      log.requestBody ? JSON.stringify(log.requestBody) : null,
      log.responseBody ? JSON.stringify(log.responseBody) : null,
      log.errorMessage || null,
      log.errorStack || null,
      log.ipAddress || null,
      log.userAgent || null,
    ]);

    await monitoringPool.query(query, values);
  } catch (error) {
    console.error('Failed to flush logs to PostgreSQL:', error);
    // Don't throw - we don't want to break the app if monitoring fails
  }
}

// Auto-flush on interval
setInterval(flushLogs, FLUSH_INTERVAL);

// Flush on process exit
process.on('beforeExit', () => {
  flushLogs();
});

// Log to PostgreSQL (buffered)
export function logToPostgres(entry: LogEntry) {
  // Skip if monitoring DB URL not configured
  if (!process.env.MONITORING_DB_URL) {
    return;
  }

  logBuffer.push(entry);

  // Flush if buffer is full
  if (logBuffer.length >= BUFFER_SIZE) {
    flushLogs();
  }
}

// Log metrics
export async function logMetric(
  metricName: string,
  metricValue: number,
  metricUnit?: string,
  tags?: Record<string, any>
) {
  if (!process.env.MONITORING_DB_URL) {
    return;
  }

  try {
    await monitoringPool.query(
      `INSERT INTO app_metrics (timestamp, metric_name, metric_value, metric_unit, tags)
       VALUES ($1, $2, $3, $4, $5)`,
      [new Date(), metricName, metricValue, metricUnit || null, tags ? JSON.stringify(tags) : null]
    );
  } catch (error) {
    console.error('Failed to log metric to PostgreSQL:', error);
  }
}

// Close pool on shutdown
export async function closeMonitoringPool() {
  await flushLogs();
  await monitoringPool.end();
}
