import { AdminNav } from './AdminNav';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 gap-8 bg-parchment px-6 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Admin</h2>
        <p className="mt-1 text-xs uppercase tracking-[0.4em] text-black/40">
          S.Goodie
        </p>
        <div className="mt-6">
          <AdminNav />
        </div>
      </aside>
      <main className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
        {children}
      </main>
    </div>
  );
}
