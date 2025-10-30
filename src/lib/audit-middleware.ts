import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/nextauth';
// import { authenticateApiKey } from '@/lib/api-auth';
import { logAudit, AuditAction, AuditEntity } from '@/lib/audit';

// Map of API routes to audit configurations
const AUDIT_CONFIG: Record<string, {
  entity: AuditEntity;
  actions: {
    GET?: AuditAction;
    POST?: AuditAction;
    PUT?: AuditAction;
    PATCH?: AuditAction;
    DELETE?: AuditAction;
  };
  skipMethods?: string[];
  extractEntityId?: (pathname: string, body?: any) => string | undefined;
}> = {
  '/api/taskgroups': {
    entity: AuditEntity.TASKGROUP,
    actions: {
      GET: undefined, // Don't audit reads
      POST: AuditAction.TASKGROUP_CREATE,
    },
    extractEntityId: (pathname, body) => body?.id,
  },
  '/api/taskgroups/[id]': {
    entity: AuditEntity.TASKGROUP,
    actions: {
      PUT: AuditAction.TASKGROUP_UPDATE,
      PATCH: AuditAction.TASKGROUP_UPDATE,
      DELETE: AuditAction.TASKGROUP_DELETE,
    },
    extractEntityId: (pathname) => {
      const match = pathname.match(/\/api\/taskgroups\/(\d+)/);
      return match?.[1];
    },
  },
  '/api/taskgroups/[id]/members': {
    entity: AuditEntity.TASKGROUP,
    actions: {
      POST: AuditAction.TASKGROUP_MEMBER_ADD,
      DELETE: AuditAction.TASKGROUP_MEMBER_REMOVE,
    },
    extractEntityId: (pathname) => {
      const match = pathname.match(/\/api\/taskgroups\/(\d+)/);
      return match?.[1];
    },
  },
  '/api/tasks': {
    entity: AuditEntity.TASK,
    actions: {
      POST: AuditAction.TASK_CREATE,
    },
    extractEntityId: (pathname, body) => body?.id,
  },
  '/api/tasks/[id]': {
    entity: AuditEntity.TASK,
    actions: {
      PUT: AuditAction.TASK_UPDATE,
      PATCH: AuditAction.TASK_UPDATE,
      DELETE: AuditAction.TASK_DELETE,
    },
    extractEntityId: (pathname) => {
      const match = pathname.match(/\/api\/tasks\/(\d+)/);
      return match?.[1];
    },
  },
  '/api/tasks/[id]/attachments': {
    entity: AuditEntity.ATTACHMENT,
    actions: {
      POST: AuditAction.TASK_ATTACHMENT_ADD,
      DELETE: AuditAction.TASK_ATTACHMENT_DELETE,
    },
    extractEntityId: (pathname) => {
      const match = pathname.match(/\/api\/tasks\/(\d+)/);
      return match?.[1];
    },
  },
  '/api/comments': {
    entity: AuditEntity.COMMENT,
    actions: {
      POST: AuditAction.COMMENT_CREATE,
    },
    extractEntityId: (pathname, body) => body?.id,
  },
  '/api/comments/[id]': {
    entity: AuditEntity.COMMENT,
    actions: {
      PUT: AuditAction.COMMENT_UPDATE,
      DELETE: AuditAction.COMMENT_DELETE,
    },
    extractEntityId: (pathname) => {
      const match = pathname.match(/\/api\/comments\/(\d+)/);
      return match?.[1];
    },
  },
  '/api/apikeys': {
    entity: AuditEntity.API_KEY,
    actions: {
      POST: AuditAction.API_KEY_CREATE,
      DELETE: AuditAction.API_KEY_DELETE,
    },
    extractEntityId: (pathname, body) => body?.id,
  },
  '/api/notifications/[id]/read': {
    entity: AuditEntity.NOTIFICATION,
    actions: {
      PATCH: AuditAction.NOTIFICATION_MARK_READ,
    },
    extractEntityId: (pathname) => {
      const match = pathname.match(/\/api\/notifications\/(\d+)/);
      return match?.[1];
    },
  },
  '/api/auth/login': {
    entity: AuditEntity.USER,
    actions: {
      POST: AuditAction.LOGIN,
    },
  },
  '/api/auth/logout': {
    entity: AuditEntity.USER,
    actions: {
      POST: AuditAction.LOGOUT,
    },
  },
  '/api/profile/password': {
    entity: AuditEntity.USER,
    actions: {
      PUT: AuditAction.PASSWORD_CHANGE,
    },
  },
  '/api/reports': {
    entity: AuditEntity.SYSTEM,
    actions: {
      GET: AuditAction.DATA_EXPORT,
    },
  },
};

// Helper function to find matching route config
function findRouteConfig(pathname: string) {
  // First try exact match
  if (AUDIT_CONFIG[pathname]) {
    return AUDIT_CONFIG[pathname];
  }

  // Then try pattern matching for dynamic routes
  for (const [pattern, config] of Object.entries(AUDIT_CONFIG)) {
    if (pattern.includes('[')) {
      const regexPattern = pattern
        .replace(/\[([^\]]+)\]/g, '([^/]+)')
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(pathname)) {
        return config;
      }
    }
  }

  return null;
}

// Middleware wrapper for audit logging
export function withAuditLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const pathname = new URL(req.url).pathname;
    const method = req.method;

    // Find audit configuration for this route
    const config = findRouteConfig(pathname);

    // Skip if no config or method should be skipped
    if (!config || config.skipMethods?.includes(method)) {
      return handler(req);
    }

    const action = config.actions[method as keyof typeof config.actions];
    if (!action) {
      return handler(req);
    }

    // Get user information
    let userId: string | undefined;
    let apiKeyId: string | undefined;
    let sessionId: string | undefined;

    // try {
    //   // Try session auth first
    //   const session = await getServerSession(authOptions);
    //   if (session?.user?.id) {
    //     userId = session.user.id;
    //     sessionId = `session_${session.user.id}_${Date.now()}`;
    //   } else {
    //     // Try API key auth
    //     const apiKeyAuth = await authenticateApiKey(req);
    //     if (apiKeyAuth?.userId) {
    //       userId = apiKeyAuth.userId;
    //       apiKeyId = apiKeyAuth.apiKeyId;
    //       sessionId = `apikey_${apiKeyAuth.apiKeyId}_${Date.now()}`;
    //     }
    //   }
    // } catch (error) {
    //   // Continue without auth info
    // }

    let response: NextResponse;
    let entityId: string | undefined;
    let metadata: any = {};

    try {
      // Get request body if available
      let body: any;
      if (req.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          const clonedReq = req.clone();
          body = await clonedReq.json();
          metadata.requestBody = body;
        } catch {
          // Body might not be JSON
        }
      }

      // Execute the actual handler
      response = await handler(req);

      // Extract entity ID if available
      if (config.extractEntityId) {
        entityId = config.extractEntityId(pathname, body);
      }

      // Log successful action
      await logAudit({
        userId,
        apiKeyId,
        action,
        entity: config.entity,
        entityId,
        metadata,
        sessionId,
        request: req,
        startTime,
      });

      return response;
    } catch (error: any) {
      // Log failed action
      await logAudit({
        userId,
        apiKeyId,
        action: AuditAction.SYSTEM_ERROR,
        entity: config.entity,
        entityId,
        metadata: {
          ...metadata,
          error: error.message,
          originalAction: action,
        },
        sessionId,
        request: req,
        startTime,
      });

      throw error;
    }
  };
}

// Simplified audit logging for specific actions
export async function auditLogin(userId: string, success: boolean, request?: NextRequest) {
  await logAudit({
    userId: success ? userId : undefined,
    action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
    entity: AuditEntity.USER,
    entityId: userId,
    metadata: { success },
    request,
  });
}

export async function auditLogout(userId: string, request?: NextRequest) {
  await logAudit({
    userId,
    action: AuditAction.LOGOUT,
    entity: AuditEntity.USER,
    entityId: userId,
    request,
  });
}

export async function auditApiKeyUse(apiKeyId: string, userId: string, request?: NextRequest) {
  await logAudit({
    userId,
    apiKeyId,
    action: AuditAction.API_KEY_USE,
    entity: AuditEntity.API_KEY,
    entityId: apiKeyId,
    request,
  });
}

export async function auditDataExport(
  userId: string,
  exportType: string,
  filters: any,
  request?: NextRequest
) {
  await logAudit({
    userId,
    action: AuditAction.DATA_EXPORT,
    entity: AuditEntity.SYSTEM,
    metadata: { exportType, filters },
    request,
  });
}