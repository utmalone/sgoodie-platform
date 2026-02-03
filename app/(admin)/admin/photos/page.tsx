import { AdminPhotosClient } from '@/components/admin/AdminPhotosClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminPhotosPage() {
  await requireAdmin();
  return <AdminPhotosClient />;
}
