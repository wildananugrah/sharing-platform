import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { withAudit, AuditAction, AuditEntity } from '@/lib/audit';

import { withLogging } from '@/lib/withLogging';
// PUT /api/profile/password - Change user password
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
    const { currentPassword, newPassword } = body;

    // Validate required fields
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required', field: 'currentPassword' },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required', field: 'newPassword' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long', field: 'newPassword' },
        { status: 400 }
      );
    }

    // Find the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        password: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a password (might be OAuth user)
    if (!user.password) {
      return NextResponse.json(
        { error: 'Cannot change password for OAuth accounts', field: 'currentPassword' },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect', field: 'currentPassword' },
        { status: 400 }
      );
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password', field: 'newPassword' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update the password with audit logging
    await withAudit(
      {
        userId: user.id,
        action: AuditAction.PASSWORD_CHANGE,
        entity: AuditEntity.USER,
        entityId: user.id,
        metadata: {
          userEmail: user.email
        }
      },
      async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedNewPassword,
          },
        });
      },
      request
    );

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
});