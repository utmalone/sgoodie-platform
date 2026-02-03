import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminPhotosPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-3xl font-semibold">Photos</h1>
      <p className="mt-3 text-sm text-black/60">
        Uploads, variant generation, and ordering will be managed here.
      </p>
    </div>
  );
}
