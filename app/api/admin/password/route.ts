import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import crypto from 'crypto';

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Verify current password
    const currentHash = crypto
      .createHash('sha256')
      .update(currentPassword)
      .digest('hex');

    const storedHash = process.env.ADMIN_PASSWORD_HASH;

    if (currentHash !== storedHash) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Generate new hash
    const newHash = crypto
      .createHash('sha256')
      .update(newPassword)
      .digest('hex');

    // Note: In production, you would update this in a secure way
    // For now, we'll just return the new hash for the user to update .env.local
    return NextResponse.json({
      success: true,
      message: 'Password validated. Update ADMIN_PASSWORD_HASH in your .env.local file with the new hash.',
      newHash
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return new NextResponse('Failed to change password', { status: 500 });
  }
}
