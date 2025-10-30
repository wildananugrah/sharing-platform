import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { withLogging } from '@/lib/withLogging';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/livekit';

// GET /api/broadcast/[id]/token - Get LiveKit token to join broadcast
export const GET = withLogging(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params;

    // Get broadcast details
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        roomName: true,
        broadcasterId: true,
        status: true,
      },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    // For viewers who are not logged in, generate a guest token
    const session = await getServerSession(authOptions);

    let participantIdentity: string;
    let participantName: string;
    let isPublisher = false;

    if (session) {
      // Logged in user
      participantIdentity = session.user.id;
      participantName = session.user.name || session.user.email || 'Anonymous';

      // Check if this is the broadcaster
      isPublisher = broadcast.broadcasterId === session.user.id;

      // Track viewer if not the broadcaster and broadcast is live
      if (!isPublisher && broadcast.status === 'live') {
        // Upsert viewer record
        await prisma.broadcastViewer.upsert({
          where: {
            broadcastId_userId: {
              broadcastId: broadcast.id,
              userId: session.user.id,
            },
          },
          update: {
            joinedAt: new Date(),
            leftAt: null,
          },
          create: {
            broadcastId: broadcast.id,
            userId: session.user.id,
          },
        });

        // Update viewer count
        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: {
            viewerCount: {
              increment: 1,
            },
          },
        });
      }
    } else {
      // Guest viewer
      participantIdentity = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      participantName = 'Guest';
      isPublisher = false;
    }

    // Generate LiveKit token
    const token = await generateToken(
      broadcast.roomName,
      participantIdentity,
      participantName,
      isPublisher
    );

    return NextResponse.json({
      token,
      roomName: broadcast.roomName,
      isPublisher,
      participantIdentity,
      participantName,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
});