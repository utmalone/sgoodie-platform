import { AdminJournalEditorClient } from '@/components/admin/AdminJournalEditorClient';
import { requireAdmin } from '@/lib/auth/require-admin';

type AdminJournalEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminJournalEditPage({ params }: AdminJournalEditPageProps) {
  await requireAdmin();
  const { id } = await params;
  return <AdminJournalEditorClient postId={id} />;
}
