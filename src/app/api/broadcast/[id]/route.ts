import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { withLogging } from '@/lib/withLogging';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { deleteRoom } from '@/lib/livekit';

// GET /api/broadcast/[id] - Get broadcast details
export const GET = withLogging(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params;
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: params.id },
      include: {
        broadcaster: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            viewers: true,
            chats: true,
          },
        },
      },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error('Error fetching broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcast' },
      { status: 500 }
    );
  }
});

// PUT /api/broadcast/[id] - Update broadcast details
export const PUT = withLogging(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user owns the broadcast
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: params.id },
      select: { broadcasterId: true },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    if (broadcast.broadcasterId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own broadcasts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, thumbnailUrl } = body;

    const updatedBroadcast = await withAudit(
      {
        userId: session.user.id,
        action: 'BROADCAST_UPDATE' as AuditAction,
        entity: 'BROADCAST' as AuditEntity,
        entityId: params.id,
        metadata: { title, description, thumbnailUrl },
      },
      async () => {
        return await prisma.broadcast.update({
          where: { id: params.id },
          data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(thumbnailUrl !== undefined && { thumbnailUrl }),
          },
        });
      },
      request
    );

    return NextResponse.json(updatedBroadcast);
  } catch (error) {
    console.error('Error updating broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to update broadcast' },
      { status: 500 }
    );
  }
});

// DELETE /api/broadcast/[id] - Delete broadcast
export const DELETE = withLogging(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user owns the broadcast
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: params.id },
      select: {
        broadcasterId: true,
        roomName: true,
        status: true,
      },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    if (broadcast.broadcasterId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own broadcasts' },
        { status: 403 }
      );
    }

    // If broadcast is live, end it first
    if (broadcast.status === 'live') {
      await deleteRoom(broadcast.roomName);
    }

    await withAudit(
      {
        userId: session.user.id,
        action: 'BROADCAST_DELETE' as AuditAction,
        entity: 'BROADCAST' as AuditEntity,
        entityId: params.id,
      },
      async () => {
        return await prisma.broadcast.delete({
          where: { id: params.id },
        });
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to delete broadcast' },
      { status: 500 }
    );
  }
});