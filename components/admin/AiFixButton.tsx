'use client';

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
      className="rounded-full border border-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-black/60 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
