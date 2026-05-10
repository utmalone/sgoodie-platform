import { Suspense } from 'react';
import { AdminPortfolioEditorClient } from '@/components/admin/AdminPortfolioEditorClient';
import { requireAdmin } from '@/lib/auth/require-admin';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditPortfolioProjectPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPortfolioEditorClient projectId={id} />
    </Suspense>
  );
}
