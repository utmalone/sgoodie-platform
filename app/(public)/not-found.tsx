import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-10 text-center shadow-sm">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-sm text-black/60">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-full border border-black/20 px-4 py-2 text-sm uppercase tracking-[0.2em] text-black/70 hover:border-brass hover:text-brass"
      >
        Back to home
      </Link>
    </div>
  );
}
