import { NextResponse } from 'next/server';
import { getProfile, updateProfile } from '@/lib/data/profile';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { updateAdminEmail } from '@/lib/auth/admin-store';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const profile = await getProfile();
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return new NextResponse('Failed to fetch profile', { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const updates = await request.json();
    const updated = await updateProfile(updates);

    if (typeof updates?.email === 'string' && updates.email.trim()) {
      try {
        await updateAdminEmail(updates.email);
      } catch (error) {
        console.error('Error updating admin email:', error);
      }
    }

    // Refresh public layout/pages so footer and contact info update immediately
    revalidatePath('/', 'layout');
    revalidatePath('/contact');

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return new NextResponse('Failed to update profile', { status: 500 });
  }
}
