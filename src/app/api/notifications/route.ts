import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';

import { withLogging } from '@/lib/withLogging';
// GET /api/notifications - Get user's notifications with filtering
export const GET = withLogging(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const type = searchParams.get('type') || 'all';

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    // Apply filter
    if (filter === 'unread') {
      where.isRead = false;
    } else if (filter === 'read') {
      where.isRead = true;
    }

    // Apply type filter
    if (type !== 'all') {
      where.type = type;
    }

    // Fetch notifications with related data
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to last 100 notifications
    });

    // Transform notifications to match frontend format
    const transformedNotifications = notifications.map((notification) => {
      // Determine actor based on notification type
      let actor = undefined;

      return {
        id: notification.id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.createdAt,
        read: notification.isRead,
        archived: false, // Add archived field to schema if needed
        relatedTaskId: notification.taskId?.toString(),
        actor,
      };
    });

    return NextResponse.json(transformedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
});

// POST /api/notifications - Create a new notification
export const POST = withLogging(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, type, title, message, taskId, commentId } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        taskId: taskId || null,
        commentId: commentId || null
      }
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
});

// PATCH /api/notifications - Update notification (mark as read/unread)
export const PATCH = withLogging(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { notificationId, isRead, markAllAsRead } = body;

    // Mark all as read
    if (markAllAsRead) {
      const count = await withAudit(
        {
          userId: user.id,
          action: AuditAction.NOTIFICATION_MARK_ALL_READ,
          entity: AuditEntity.NOTIFICATION,
          metadata: {
            userId: user.id
          }
        },
        async () => {
          const result = await prisma.notification.updateMany({
            where: {
              userId: user.id,
              isRead: false,
            },
            data: {
              isRead: true,
            },
          });
          return result.count;
        },
        req
      );

      return NextResponse.json({ message: 'All notifications marked as read', count });
    }

    // Mark single notification as read/unread
    if (notificationId) {
      const notification = await withAudit(
        {
          userId: user.id,
          action: AuditAction.NOTIFICATION_MARK_READ,
          entity: AuditEntity.NOTIFICATION,
          entityId: notificationId.toString(),
          metadata: {
            notificationId: parseInt(notificationId),
            isRead: isRead !== undefined ? isRead : true
          }
        },
        async () => {
          return await prisma.notification.updateMany({
            where: {
              id: parseInt(notificationId),
              userId: user.id, // Ensure user owns this notification
            },
            data: {
              isRead: isRead !== undefined ? isRead : true,
            },
          });
        },
        req
      );

      if (notification.count === 0) {
        return NextResponse.json(
          { error: 'Notification not found or unauthorized' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Notification updated' });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
});

// DELETE /api/notifications - Delete notification
export const DELETE = withLogging(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Delete notification (only if user owns it)
    const deleted = await prisma.notification.deleteMany({
      where: {
        id: parseInt(notificationId),
        userId: user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Notification not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
});