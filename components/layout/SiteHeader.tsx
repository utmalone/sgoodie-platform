import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/work/interiors', label: 'Interiors' },
  { href: '/work/travel', label: 'Travel' },
  { href: '/work/brand-marketing', label: 'Brand Marketing' },
  { href: '/about', label: 'About' }
];

export function SiteHeader() {
  return (
    <header className="border-b border-black/10 bg-parchment">
      <div className="container-page flex items-center justify-between py-6">
        <Link href="/" className="text-lg font-semibold tracking-wide">
          S.Goodie Photography
        </Link>
        <nav className="flex items-center gap-6 text-sm uppercase tracking-[0.2em]">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brass">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
