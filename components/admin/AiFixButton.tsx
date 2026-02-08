'use client';

import { Loader2 } from 'lucide-react';
import styles from '@/styles/admin/AiFixButton.module.css';

type AiFixButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
};

export function AiFixButton({ onClick, disabled, loading, label = 'AI Fix' }: AiFixButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={styles.button}
    >
      {loading ? (
        <Loader2 className={styles.spinner} aria-hidden />
      ) : (
        label
      )}
    </button>
  );
}
