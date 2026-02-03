import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">About</p>
        <h1 className="mt-4 text-4xl font-semibold">S.Goodie Photography</h1>
        <p className="mt-4 text-base text-black/70">
          S.Goodie is a photography studio specializing in interiors, travel, and brand
          marketing imagery. We focus on light, spatial storytelling, and refined detail
          to bring every project to life.
        </p>
        <p className="mt-4 text-base text-black/70">
          From boutique hotels to modern residences and personal brands, we craft visual
          narratives that feel elevated, authentic, and timeless.
        </p>
      </div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
        <Image
          src="/placeholder.svg"
          alt="Studio portrait placeholder"
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
