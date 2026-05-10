import { AdminPortfolioClient } from '@/components/admin/AdminPortfolioClient';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminPortfolioPage() {
  await requireAdmin();
  return <AdminPortfolioClient />;
}
