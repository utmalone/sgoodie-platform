import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-3 text-sm text-black/60">
        Overview and quick actions will live here. This is the admin home base.
      </p>
    </div>
  );
}
