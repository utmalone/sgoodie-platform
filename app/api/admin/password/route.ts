import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { updateAdminPassword } from '@/lib/auth/admin-store';

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

    const result = await updateAdminPassword(currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return new NextResponse('Failed to change password', { status: 500 });
  }
}
