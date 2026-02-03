import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboardPage() {
  await requireAdmin();
  return <AdminDashboardClient />;
}
