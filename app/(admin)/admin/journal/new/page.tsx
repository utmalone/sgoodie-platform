import { AdminJournalEditorClient } from '@/components/admin/AdminJournalEditorClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminJournalNewPage() {
  await requireAdmin();
  return <AdminJournalEditorClient />;
}
