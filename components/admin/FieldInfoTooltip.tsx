'use client';

import { Info } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import styles from '@/styles/admin/FieldInfoTooltip.module.css';

type FieldInfoTooltipExample = {
  src: string;
  alt: string;
  caption?: string;
};

type FieldInfoTooltipProps = {
  label: string;
  lines: string[];
  align?: 'left' | 'center' | 'right';
  className?: string;
  example?: FieldInfoTooltipExample;
};

const ALIGN_CLASSES: Record<NonNullable<FieldInfoTooltipProps['align']>, string> = {
  left: styles.alignLeft,
  center: styles.alignCenter,
  right: styles.alignRight
};

export function FieldInfoTooltip({
  label,
  lines,
  align = 'right',
  className,
  example
}: FieldInfoTooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [isExampleOpen, setIsExampleOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] =
    useState<NonNullable<FieldInfoTooltipProps['align']>>(align);

  const hasContent = lines.length > 0 || Boolean(example);
  const triggerClassName = [styles.tooltipTrigger, className || ''].filter(Boolean).join(' ');
  const tooltipClassName = [styles.tooltip, ALIGN_CLASSES[resolvedAlign]].filter(Boolean).join(' ');

  const exampleAlt = example?.alt || `${label} example`;

  const recomputeAlign = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) {
      setResolvedAlign(align);
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;

    if (!tooltipWidth || Number.isNaN(tooltipWidth)) {
      setResolvedAlign(align);
      return;
    }

    const viewportWidth = window.innerWidth || 0;
    const margin = 12;

    let nextAlign = align;

    if (align === 'right') {
      // Default: show tooltip to the right of the icon.
      const tooltipRight = triggerRect.left + tooltipWidth;
      if (tooltipRight > viewportWidth - margin) {
        nextAlign = 'left';
      }
    } else if (align === 'left') {
      // Prefer showing tooltip to the left of the icon.
      const tooltipLeft = triggerRect.right - tooltipWidth;
      if (tooltipLeft < margin) {
        nextAlign = 'right';
      }
    } else {
      // Centered; if it would overflow, flip to whichever side has space.
      const centeredLeft = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
      const centeredRight = centeredLeft + tooltipWidth;
      if (centeredRight > viewportWidth - margin) {
        nextAlign = 'left';
      } else if (centeredLeft < margin) {
        nextAlign = 'right';
      }
    }

    setResolvedAlign(nextAlign);
  }, [align]);

  useEffect(() => {
    if (!isExampleOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExampleOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus close button for keyboard users.
    window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isExampleOpen]);

  useEffect(() => {
    if (!hasContent) return;
    // Defer to ensure layout is complete before measuring.
    const id = window.requestAnimationFrame(recomputeAlign);
    window.addEventListener('resize', recomputeAlign);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', recomputeAlign);
    };
  }, [hasContent, recomputeAlign, lines, example?.src, example?.caption]);

  if (!hasContent) return null;

  return (
    <span
      ref={triggerRef}
      tabIndex={0}
      aria-label={`${label} help`}
      aria-describedby={tooltipId}
      className={triggerClassName}
      onMouseEnter={recomputeAlign}
      onFocus={recomputeAlign}
    >
      <Info className={styles.icon} aria-hidden="true" focusable="false" strokeWidth={1.75} />
      <span ref={tooltipRef} id={tooltipId} role="tooltip" className={tooltipClassName}>
        <span className={styles.tooltipLabel}>{label}</span>
        {lines.map((line, index) => (
          <span key={`${label}-${index}`} className={styles.tooltipLine}>
            {line}
          </span>
        ))}
        {example && (
          <span className={styles.exampleWrap}>
            <button
              type="button"
              className={styles.exampleButton}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsExampleOpen(true);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={example.src} alt={exampleAlt} className={styles.exampleImage} />
              <span className={styles.exampleHint}>Click to enlarge</span>
            </button>
          </span>
        )}
      </span>

      {isExampleOpen && example && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={`${label} example`}
          onMouseDown={() => setIsExampleOpen(false)}
        >
          <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>{label}</p>
              <button
                ref={closeBtnRef}
                type="button"
                className={styles.modalClose}
                onClick={() => setIsExampleOpen(false)}
              >
                Close
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={example.src} alt={exampleAlt} className={styles.modalImage} />
              {example.caption && <p className={styles.modalCaption}>{example.caption}</p>}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
