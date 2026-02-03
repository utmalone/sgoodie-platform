import Link from 'next/link';

const categories = [
  {
    title: 'Interiors',
    description: 'Home, garden, hospitality, and architectural storytelling.',
    href: '/work/interiors'
  },
  {
    title: 'Travel',
    description: 'Places, textures, and light from around the world.',
    href: '/work/travel'
  },
  {
    title: 'Brand Marketing',
    description: 'Visual identity for personal and commercial brands.',
    href: '/work/brand-marketing'
  }
];

export default function WorkPage() {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">Work</p>
        <h1 className="mt-4 text-4xl font-semibold">Portfolio Collections</h1>
        <p className="mt-4 max-w-2xl text-base text-black/70">
          Browse the portfolio by category. Each collection is curated to showcase
          light, composition, and story.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.title}
            href={category.href}
            className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-2xl font-semibold">{category.title}</h2>
            <p className="mt-3 text-sm text-black/60">{category.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
