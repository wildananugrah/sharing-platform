import { prisma } from './prisma';

// App-level role hierarchy
export type AppRole = 'superadmin' | 'admin' | 'lead' | 'member' | 'client';

// Task group role types
export type TaskGroupRole = 'owner' | 'admin' | 'member' | 'inherit';

/**
 * Permission matrix for app-level roles
 */
export const permissions = {
  canCreateTaskGroup: (role: string): boolean => {
    return ['superadmin', 'admin', 'lead'].includes(role);
  },

  canDeleteTaskGroup: (role: string): boolean => {
    return ['superadmin', 'admin', 'lead'].includes(role);
  },

  canCreateTask: (role: string): boolean => {
    return ['superadmin', 'admin', 'lead', 'member'].includes(role);
  },

  canDeleteTask: (role: string): boolean => {
    return ['superadmin', 'admin', 'lead'].includes(role);
  },

  canAssignUsers: (role: string): boolean => {
    return ['superadmin', 'admin', 'lead', 'member'].includes(role);
  },

  canComment: (role: string): boolean => {
    // All roles can comment, including client
    return true;
  },

  canAccessAdminPages: (role: string): boolean => {
    return ['superadmin', 'admin'].includes(role);
  },

  canManageUserRoles: (role: string): boolean => {
    return ['superadmin', 'admin'].includes(role);
  },

  canChangeSuperadminRole: (role: string): boolean => {
    // Only superadmin can change superadmin roles (but not via API, only in DB)
    return role === 'superadmin';
  },

  canChangeAdminRole: (role: string): boolean => {
    // Only superadmin can change admin to/from other roles
    return role === 'superadmin';
  },
};

/**
 * Get the effective role for a user in a specific task group
 * If the user's task group role is 'inherit', returns their app-level role
 * Otherwise, returns their task group role
 */
export async function getEffectiveRole(
  userId: string,
  taskGroupId: number
): Promise<string> {
  try {
    // Get user's app-level role
    const userExtension = await prisma.userExtension.findUnique({
      where: { userId },
      select: { role: true },
    });

    const appRole = userExtension?.role || 'client';

    // Get user's task group membership
    const membership = await prisma.taskGroupMember.findUnique({
      where: {
        taskGroupId_userId: {
          taskGroupId,
          userId,
        },
      },
      select: { role: true },
    });

    // If no membership, user is not in the group
    if (!membership) {
      return 'none';
    }

    // If role is 'inherit', use app-level role
    if (membership.role === 'inherit') {
      return appRole;
    }

    // Otherwise, use task group role
    return membership.role;
  } catch (error) {
    console.error('Error getting effective role:', error);
    return 'client'; // Default to most restrictive
  }
}

/**
 * Check if user has permission to perform an action in a task group
 */
export async function hasPermissionInTaskGroup(
  userId: string,
  taskGroupId: number,
  permission: keyof typeof permissions
): Promise<boolean> {
  const effectiveRole = await getEffectiveRole(userId, taskGroupId);

  if (effectiveRole === 'none') {
    return false;
  }

  const permissionFn = permissions[permission];
  if (typeof permissionFn === 'function') {
    return permissionFn(effectiveRole);
  }

  return false;
}

/**
 * Get role display information
 */
export function getRoleInfo(role: string): {
  label: string;
  color: string;
  description: string;
} {
  const roleMap: Record<
    string,
    { label: string; color: string; description: string }
  > = {
    superadmin: {
      label: 'Super Admin',
      color: 'purple',
      description: 'Full system access, cannot be changed via UI',
    },
    admin: {
      label: 'Admin',
      color: 'blue',
      description: 'Full system access, can manage users and settings',
    },
    lead: {
      label: 'Lead',
      color: 'green',
      description: 'Can create/manage task groups and all tasks',
    },
    member: {
      label: 'Member',
      color: 'gray',
      description: 'Can create tasks and participate in task groups',
    },
    client: {
      label: 'Client',
      color: 'yellow',
      description: 'Read-only access with comment ability',
    },
    owner: {
      label: 'Owner',
      color: 'indigo',
      description: 'Task group creator with full control',
    },
    inherit: {
      label: 'Inherit',
      color: 'slate',
      description: 'Uses app-level role permissions',
    },
  };

  return roleMap[role] || {
    label: role,
    color: 'gray',
    description: 'Unknown role',
  };
}

/**
 * Check if a role update is allowed
 */
export function canUpdateRole(
  requestorRole: string,
  targetCurrentRole: string,
  targetNewRole: string,
  isSelf: boolean
): { allowed: boolean; reason?: string } {
  // Cannot change your own superadmin role via API
  if (isSelf && targetCurrentRole === 'superadmin') {
    return {
      allowed: false,
      reason: 'Superadmin role can only be changed directly in the database',
    };
  }

  // Only superadmin can change superadmin roles
  if (targetCurrentRole === 'superadmin' && requestorRole !== 'superadmin') {
    return {
      allowed: false,
      reason: 'Only superadmin can change superadmin roles',
    };
  }

  // Only superadmin can change users to/from admin role
  if (
    (targetCurrentRole === 'admin' || targetNewRole === 'admin') &&
    requestorRole !== 'superadmin'
  ) {
    return {
      allowed: false,
      reason: 'Only superadmin can change admin roles',
    };
  }

  // Admin and superadmin can change other roles
  if (requestorRole === 'superadmin' || requestorRole === 'admin') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Insufficient permissions to change roles',
  };
}
