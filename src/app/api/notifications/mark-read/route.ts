import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';

import { withLogging } from '@/lib/withLogging';
// PUT /api/notifications/mark-read - Mark notification(s) as read
export const PUT = withLogging(async (request: NextRequest) => {
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

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all notifications as read for the user
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } else if (notificationId) {
      // Parse notification ID to integer
      const parsedNotificationId = parseInt(notificationId, 10);

      if (isNaN(parsedNotificationId)) {
        return NextResponse.json(
          { error: 'Invalid notification ID' },
          { status: 400 }
        );
      }

      // Mark specific notification as read
      const notification = await prisma.notification.updateMany({
        where: {
          id: parsedNotificationId,
          userId: user.id
        },
        data: {
          isRead: true
        }
      });

      if (notification.count === 0) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    } else {
      return NextResponse.json(
        { error: 'Either notificationId or markAllAsRead must be provided' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
});