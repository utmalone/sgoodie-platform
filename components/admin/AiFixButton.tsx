'use client';

import styles from '@/styles/admin/AiFixButton.module.css';

type AiFixButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
};

export function AiFixButton({ onClick, disabled, label = 'AI Fix' }: AiFixButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={styles.button}
    >
      {label}
    </button>
  );
}
