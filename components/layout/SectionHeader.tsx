type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <p className="text-xs uppercase tracking-[0.4em] text-black/50">Portfolio</p>
      <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-sm text-black/60">{subtitle}</p>}
    </div>
  );
}
