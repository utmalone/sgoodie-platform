import { AdminJournalClient } from '@/components/admin/AdminJournalClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminJournalPage() {
  await requireAdmin();
  return <AdminJournalClient />;
}
