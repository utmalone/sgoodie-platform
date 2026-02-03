import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminProjectsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-3xl font-semibold">Projects</h1>
      <p className="mt-3 text-sm text-black/60">
        Project creation, ordering, and metadata management will live here.
      </p>
    </div>
  );
}
