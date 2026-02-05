import { AdminWorkEditorClient } from '@/components/admin/AdminWorkEditorClient';
import { requireAdmin } from '@/lib/auth/require-admin';

type AdminWorkEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminWorkEditPage({ params }: AdminWorkEditPageProps) {
  await requireAdmin();
  const { id } = await params;
  return <AdminWorkEditorClient projectId={id} />;
}
