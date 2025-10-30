import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { withLogging } from '@/lib/withLogging';
import { prisma } from '@/lib/prisma';

// GET /api/chat?broadcastId=xxx - Get chat messages for a broadcast
export const GET = withLogging(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const broadcastId = searchParams.get('broadcastId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!broadcastId) {
      return NextResponse.json(
        { error: 'broadcastId is required' },
        { status: 400 }
      );
    }

    // Check if broadcast exists
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    // Get chat messages
    const messages = await prisma.chat.findMany({
      where: {
        broadcastId,
        isDeleted: false, // Don't show deleted messages
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
});

// POST /api/chat - Send a chat message
export const POST = withLogging(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to chat' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { broadcastId, message } = body;

    if (!broadcastId || !message) {
      return NextResponse.json(
        { error: 'broadcastId and message are required' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.trim().length === 0 || message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be between 1 and 500 characters' },
        { status: 400 }
      );
    }

    // Check if broadcast exists and is live
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true, status: true },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      );
    }

    // Allow chat for live and recently ended broadcasts
    if (broadcast.status === 'preparing') {
      return NextResponse.json(
        { error: 'Broadcast has not started yet' },
        { status: 400 }
      );
    }

    // Create chat message
    const chatMessage = await prisma.chat.create({
      data: {
        broadcastId,
        userId: session.user.id,
        message: message.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(chatMessage);
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
});

// DELETE /api/chat?id=xxx - Delete a chat message (for moderation)
export const DELETE = withLogging(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Get the message and check permissions
    const message = await prisma.chat.findUnique({
      where: { id: messageId },
      select: {
        userId: true,
        broadcast: {
          select: {
            broadcasterId: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // User can delete their own message or broadcaster can delete any message
    const canDelete =
      message.userId === session.user.id ||
      message.broadcast.broadcasterId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Soft delete the message
    await prisma.chat.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedBy: session.user.id,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
});