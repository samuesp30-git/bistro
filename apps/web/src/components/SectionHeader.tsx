interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-12 text-center">
      <h2 className="font-display text-4xl font-semibold tracking-wide text-ink md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-md text-base text-ink-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
