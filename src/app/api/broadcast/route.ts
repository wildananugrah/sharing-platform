import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { withLogging } from '@/lib/withLogging';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';

import { createRoom } from '@/lib/livekit';
import { prisma } from '@/lib/prisma';

// GET /api/broadcast - Get list of broadcasts
export const GET = withLogging(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // live, ended, all
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status && status !== 'all' ? { status } : {};

    const broadcasts = await prisma.broadcast.findMany({
      where,
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
      orderBy: [
        { status: 'asc' }, // Live broadcasts first
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    const total = await prisma.broadcast.count({ where });

    return NextResponse.json({
      broadcasts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
});

// POST /api/broadcast - Create a new broadcast
export const POST = withLogging(async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to broadcast' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create broadcast with audit logging
    const broadcast = await withAudit(
      {
        userId: session.user.id,
        action: 'BROADCAST_CREATE' as AuditAction,
        entity: 'BROADCAST' as AuditEntity,
        metadata: { title, description },
      },
      async () => {
        // Generate unique room name
        const roomName = `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create LiveKit room
        const room = await createRoom(roomName);

        // Create broadcast in database
        return await prisma.broadcast.create({
          data: {
            title: title.trim(),
            description: description?.trim() || null,
            roomName,
            roomId: room.sid,
            broadcasterId: session.user.id,
            status: 'preparing',
          },
          include: {
            broadcaster: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });
      },
      request
    );

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error('Error creating broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to create broadcast' },
      { status: 500 }
    );
  }
});