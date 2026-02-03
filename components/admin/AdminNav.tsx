import Link from 'next/link';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/photos', label: 'Photos' }
];

export function AdminNav() {
  return (
    <nav className="flex flex-col gap-3 text-sm">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="text-black/70 hover:text-brass">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
