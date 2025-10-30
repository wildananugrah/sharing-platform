import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

// Audit action types
export enum AuditAction {
  // Authentication & User
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  USER_REGISTER = 'USER_REGISTER',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  API_KEY_CREATE = 'API_KEY_CREATE',
  API_KEY_DELETE = 'API_KEY_DELETE',
  API_KEY_USE = 'API_KEY_USE',

  // Task Groups
  TASKGROUP_CREATE = 'TASKGROUP_CREATE',
  TASKGROUP_UPDATE = 'TASKGROUP_UPDATE',
  TASKGROUP_DELETE = 'TASKGROUP_DELETE',
  TASKGROUP_MEMBER_ADD = 'TASKGROUP_MEMBER_ADD',
  TASKGROUP_MEMBER_REMOVE = 'TASKGROUP_MEMBER_REMOVE',
  TASKGROUP_MEMBER_ROLE_CHANGE = 'TASKGROUP_MEMBER_ROLE_CHANGE',

  // Tasks
  TASK_CREATE = 'TASK_CREATE',
  TASK_UPDATE = 'TASK_UPDATE',
  TASK_DELETE = 'TASK_DELETE',
  TASK_STATUS_CHANGE = 'TASK_STATUS_CHANGE',
  TASK_ASSIGN = 'TASK_ASSIGN',
  TASK_UNASSIGN = 'TASK_UNASSIGN',
  TASK_ATTACHMENT_ADD = 'TASK_ATTACHMENT_ADD',
  TASK_ATTACHMENT_DELETE = 'TASK_ATTACHMENT_DELETE',

  // Comments
  COMMENT_CREATE = 'COMMENT_CREATE',
  COMMENT_UPDATE = 'COMMENT_UPDATE',
  COMMENT_DELETE = 'COMMENT_DELETE',

  // Notifications
  NOTIFICATION_MARK_READ = 'NOTIFICATION_MARK_READ',
  NOTIFICATION_MARK_ALL_READ = 'NOTIFICATION_MARK_ALL_READ',

  // Data Export
  DATA_EXPORT = 'DATA_EXPORT',
  AUDIT_EXPORT = 'AUDIT_EXPORT',

  // System
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SYSTEM_SETTINGS_UPDATE = 'SYSTEM_SETTINGS_UPDATE',
}

export enum AuditEntity {
  USER = 'USER',
  TASKGROUP = 'TASKGROUP',
  TASK = 'TASK',
  COMMENT = 'COMMENT',
  NOTIFICATION = 'NOTIFICATION',
  API_KEY = 'API_KEY',
  ATTACHMENT = 'ATTACHMENT',
  SYSTEM = 'SYSTEM',
}

interface AuditLogEntry {
  userId?: string | null;
  apiKeyId?: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  duration?: number | null;
}

// Queue for batching audit logs
class AuditQueue {
  private queue: AuditLogEntry[] = [];
  private isProcessing = false;
  private batchSize = 10; // Process 10 logs at a time
  private flushInterval = 5000; // Flush every 5 seconds
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // Start the periodic flush
    this.startPeriodicFlush();
  }

  private startPeriodicFlush() {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async add(entry: AuditLogEntry) {
    this.queue.push(entry);

    // If queue is getting large, flush immediately
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Take a batch from the queue
    const batch = this.queue.splice(0, this.batchSize);

    try {
      // Batch insert to database
      await prisma.auditLog.createMany({
        data: batch,
        skipDuplicates: true,
      });
    } catch (error) {
      console.error('Failed to write audit logs:', error);
      // In production, you might want to write to a fallback location
      // or use a more robust queue system like Redis or RabbitMQ
    } finally {
      this.isProcessing = false;

      // If there are more items, continue processing
      if (this.queue.length > 0) {
        setTimeout(() => this.flush(), 100);
      }
    }
  }

  async shutdown() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Flush remaining items
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}

// Global audit queue instance
const auditQueue = new AuditQueue();

// Main audit logging function
export async function logAudit(
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'> & {
    request?: NextRequest;
    startTime?: number;
  }
) {
  const { request, startTime, ...auditData } = entry;

  // Calculate duration if start time is provided
  let duration: number | undefined;
  if (startTime) {
    duration = Date.now() - startTime;
  }

  // Extract IP and user agent from request if available
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  if (request) {
    // Get IP address (handle various proxy headers)
    ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';

    userAgent = request.headers.get('user-agent') || undefined;
  }

  // Add to queue for async processing
  await auditQueue.add({
    ...auditData,
    ipAddress,
    userAgent,
    duration,
  });
}

// Helper function to log with performance tracking
export function withAudit<T>(
  auditInfo: Omit<AuditLogEntry, 'duration' | 'ipAddress' | 'userAgent'>,
  fn: () => Promise<T>,
  request?: NextRequest
): Promise<T> {
  const startTime = Date.now();

  return fn()
    .then(async (result) => {
      // Log success
      await logAudit({
        ...auditInfo,
        request,
        startTime,
      });
      return result;
    })
    .catch(async (error) => {
      // Log failure
      await logAudit({
        ...auditInfo,
        action: AuditAction.SYSTEM_ERROR,
        metadata: {
          ...auditInfo.metadata,
          error: error.message,
          originalAction: auditInfo.action,
        },
        request,
        startTime,
      });
      throw error;
    });
}

// Cleanup function for graceful shutdown
export async function cleanupAudit() {
  await auditQueue.shutdown();
}

// Function to get audit logs with pagination
export async function getAuditLogs(params: {
  userId?: string;
  entity?: AuditEntity;
  entityId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const {
    userId,
    entity,
    entityId,
    action,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = params;

  const where: any = {};

  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// Function to archive old audit logs
export async function archiveOldAuditLogs(daysToKeep: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  // In a production environment, you might want to:
  // 1. Export old logs to a data warehouse or cold storage
  // 2. Compress and store in S3
  // 3. Move to a separate archive table

  // For now, we'll just count what would be archived
  const count = await prisma.auditLog.count({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  // Uncomment to actually delete old logs
  // await prisma.auditLog.deleteMany({
  //   where: {
  //     createdAt: {
  //       lt: cutoffDate,
  //     },
  //   },
  // });

  return { archivedCount: count, cutoffDate };
}

// Export audit logs to CSV/JSON
export async function exportAuditLogs(
  params: Parameters<typeof getAuditLogs>[0],
  format: 'csv' | 'json' = 'json'
) {
  // Get all logs without pagination for export
  const allParams = { ...params, page: 1, limit: 10000 };
  const { logs } = await getAuditLogs(allParams);

  if (format === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  // CSV format
  const headers = [
    'ID',
    'Date',
    'User',
    'Action',
    'Entity',
    'Entity ID',
    'IP Address',
    'Duration (ms)',
    'Metadata',
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt.toISOString(),
    log.user?.email || 'System',
    log.action,
    log.entity,
    log.entityId || '',
    log.ipAddress || '',
    log.duration || '',
    JSON.stringify(log.metadata || {}),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}