import { AdminProfileClient } from '@/components/admin/AdminProfileClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminProfilePage() {
  await requireAdmin();
  return <AdminProfileClient />;
}
