'use client';

import type { PhotoGuideline } from '@/lib/admin/photo-guidelines';
import styles from '@/styles/admin/PhotoGuidelines.module.css';

type PhotoGuidelineTooltipProps = {
  label: string;
  lines: string[];
  className?: string;
  align?: 'left' | 'center' | 'right';
};

const ALIGN_CLASSES: Record<NonNullable<PhotoGuidelineTooltipProps['align']>, string> = {
  left: styles.alignLeft,
  center: styles.alignCenter,
  right: styles.alignRight
};

export function PhotoGuidelineTooltip({
  label,
  lines,
  className,
  align = 'center'
}: PhotoGuidelineTooltipProps) {
  if (!lines.length) return null;

  const triggerClassName = [styles.tooltipTrigger, className || ''].filter(Boolean).join(' ');
  const tooltipClassName = [styles.tooltip, ALIGN_CLASSES[align]].filter(Boolean).join(' ');

  return (
    <span
      tabIndex={0}
      aria-label={`${label} photo guidelines`}
      className={triggerClassName}
    >
      i
      <span className={tooltipClassName}>
        <span className={styles.tooltipLabel}>{label}</span>
        {lines.map((line) => (
          <span key={line} className={styles.tooltipLine}>
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

export function PhotoGuidelineRow({
  guideline,
  align
}: {
  guideline: PhotoGuideline;
  align?: PhotoGuidelineTooltipProps['align'];
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{guideline.label}</span>
      <PhotoGuidelineTooltip label={guideline.label} lines={guideline.lines} align={align} />
    </div>
  );
}
