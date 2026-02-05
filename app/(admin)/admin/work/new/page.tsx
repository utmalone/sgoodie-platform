import { AdminWorkEditorClient } from '@/components/admin/AdminWorkEditorClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminWorkNewPage() {
  await requireAdmin();
  return <AdminWorkEditorClient />;
}
