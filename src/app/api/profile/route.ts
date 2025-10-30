import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';

import { withLogging } from '@/lib/withLogging';
// GET /api/profile - Get user profile
export const GET = withLogging(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
});

// PUT /api/profile - Update user profile
export const PUT = withLogging(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if email is valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find the current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the new email is already taken by another user
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser && existingUser.id !== currentUser.id) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        );
      }
    }

    // Build changes object
    const changes: any = {};
    if (name !== currentUser.name) {
      changes.name = { from: currentUser.name, to: name };
    }
    if (email !== currentUser.email) {
      changes.email = { from: currentUser.email, to: email };
    }

    // Update the user with audit logging
    const updatedUser = await withAudit(
      {
        userId: currentUser.id,
        action: AuditAction.PROFILE_UPDATE,
        entity: AuditEntity.USER,
        entityId: currentUser.id,
        metadata: {
          changes
        }
      },
      async () => {
        return await prisma.user.update({
          where: { id: currentUser.id },
          data: {
            name: name || null,
            email,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          }
        });
      },
      request
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
});