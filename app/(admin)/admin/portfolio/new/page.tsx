import { Suspense } from 'react';
import { AdminPortfolioEditorClient } from '@/components/admin/AdminPortfolioEditorClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminNewPortfolioProjectPage() {
  await requireAdmin();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPortfolioEditorClient />
    </Suspense>
  );
}
