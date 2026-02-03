import { AdminPagesClient } from '@/components/admin/AdminPagesClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminPagesPage() {
  await requireAdmin();
  return <AdminPagesClient />;
}
