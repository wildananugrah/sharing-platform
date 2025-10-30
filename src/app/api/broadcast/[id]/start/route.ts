import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { withLogging } from '@/lib/withLogging';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { startRecording } from '@/lib/livekit';

// POST /api/broadcast/[id]/start - Start broadcasting
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
        { error: 'You can only start your own broadcasts' },
        { status: 403 }
      );
    }

    if (broadcast.status === 'live') {
      return NextResponse.json(
        { error: 'Broadcast is already live' },
        { status: 400 }
      );
    }

    // Start recording
    const egressId = await startRecording(
      broadcast.roomName,
      params.id,
      process.env.S3_BUCKET_NAME!
    );

    // Update broadcast status
    const updatedBroadcast = await withAudit(
      {
        userId: session.user.id,
        action: 'BROADCAST_START' as AuditAction,
        entity: 'BROADCAST' as AuditEntity,
        entityId: params.id,
        metadata: { egressId },
      },
      async () => {
        return await prisma.broadcast.update({
          where: { id: params.id },
          data: {
            status: 'live',
            startedAt: new Date(),
            egressId: egressId || null,
          },
        });
      },
      request
    );

    // Send notification to followers (if you have a follower system)
    // This is a placeholder for future implementation
    // await notifyFollowers(session.user.id, params.id);

    return NextResponse.json(updatedBroadcast);
  } catch (error) {
    console.error('Error starting broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to start broadcast' },
      { status: 500 }
    );
  }
});