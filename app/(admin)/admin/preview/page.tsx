import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminPreviewClient } from '@/components/admin/AdminPreviewClient';

export default async function AdminPreviewPage() {
  await requireAdmin();
  return <AdminPreviewClient />;
}
