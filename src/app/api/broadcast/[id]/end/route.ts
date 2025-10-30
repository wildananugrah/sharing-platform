import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { withLogging } from '@/lib/withLogging';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { stopRecording, deleteRoom } from '@/lib/livekit';

// POST /api/broadcast/[id]/end - End broadcasting
export const POST = withLogging(async (
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
        egressId: true,
        startedAt: true,
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
        { error: 'You can only end your own broadcasts' },
        { status: 403 }
      );
    }

    if (broadcast.status !== 'live') {
      return NextResponse.json(
        { error: 'Broadcast is not live' },
        { status: 400 }
      );
    }

    // Stop recording if it was started
    if (broadcast.egressId) {
      await stopRecording(broadcast.egressId);
    }

    // Delete the LiveKit room
    await deleteRoom(broadcast.roomName);

    // Calculate duration
    const duration = broadcast.startedAt
      ? Math.floor((new Date().getTime() - broadcast.startedAt.getTime()) / 1000)
      : 0;

    // Update broadcast status
    const updatedBroadcast = await withAudit(
      {
        userId: session.user.id,
        action: 'BROADCAST_END' as AuditAction,
        entity: 'BROADCAST' as AuditEntity,
        entityId: params.id,
        metadata: { duration },
      },
      async () => {
        // Get peak viewer count before updating
        const viewerStats = await prisma.broadcast.findUnique({
          where: { id: params.id },
          select: { viewerCount: true, peakViewerCount: true },
        });

        return await prisma.broadcast.update({
          where: { id: params.id },
          data: {
            status: 'ended',
            endedAt: new Date(),
            duration,
            viewerCount: 0, // Reset current viewers
            peakViewerCount: Math.max(
              viewerStats?.peakViewerCount || 0,
              viewerStats?.viewerCount || 0
            ),
          },
        });
      },
      request
    );

    // Update all active viewers' leftAt timestamp
    await prisma.broadcastViewer.updateMany({
      where: {
        broadcastId: params.id,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
      },
    });

    return NextResponse.json(updatedBroadcast);
  } catch (error) {
    console.error('Error ending broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to end broadcast' },
      { status: 500 }
    );
  }
});