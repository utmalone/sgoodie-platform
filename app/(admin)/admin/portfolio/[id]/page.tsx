import { Suspense } from 'react';
import { AdminPortfolioEditorClient } from '@/components/admin/AdminPortfolioEditorClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditPortfolioProjectPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPortfolioEditorClient projectId={id} />
    </Suspense>
  );
}
