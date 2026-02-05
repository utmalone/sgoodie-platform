import { AdminWorkClient } from '@/components/admin/AdminWorkClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminWorkPage() {
  await requireAdmin();
  return <AdminWorkClient />;
}
