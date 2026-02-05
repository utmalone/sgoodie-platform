import { Suspense } from 'react';
import { AdminPortfolioEditorClient } from '@/components/admin/AdminPortfolioEditorClient';

export default function AdminNewPortfolioProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPortfolioEditorClient />
    </Suspense>
  );
}
