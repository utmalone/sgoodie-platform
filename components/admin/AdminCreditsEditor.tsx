'use client';

import { useState } from 'react';
import type { ProjectCredit } from '@/types';
import styles from '@/styles/admin/AdminCreditsEditor.module.css';

type AdminCreditsEditorProps = {
  credits: ProjectCredit[];
  onChange: (credits: ProjectCredit[]) => void;
};

export function AdminCreditsEditor({ credits, onChange }: AdminCreditsEditorProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  function handleAdd() {
    if (!newLabel.trim() || !newValue.trim()) return;
    onChange([...credits, { label: newLabel.trim(), value: newValue.trim() }]);
    setNewLabel('');
    setNewValue('');
  }

  function handleRemove(index: number) {
    onChange(credits.filter((_, i) => i !== index));
  }

  function handleUpdate(index: number, field: 'label' | 'value', value: string) {
    onChange(
      credits.map((credit, i) =>
        i === index ? { ...credit, [field]: value } : credit
      )
    );
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next = [...credits];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index: number) {
    if (index === credits.length - 1) return;
    const next = [...credits];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div className={styles.wrapper}>
      {/* Existing Credits */}
      {credits.length > 0 && (
        <div className={styles.list}>
          {credits.map((credit, index) => (
            <div
              key={`${credit.label}-${index}`}
              className={styles.row}
            >
              <input
                type="text"
                value={credit.label}
                onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                placeholder="Label"
                className={styles.labelInput}
              />
              <input
                type="text"
                value={credit.value}
                onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                placeholder="Value"
                className={styles.valueInput}
              />
              <div className={styles.actionRow}>
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className={styles.iconButton}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === credits.length - 1}
                  className={styles.iconButton}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className={styles.iconButtonDanger}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Credit */}
      <div className={styles.addRow}>
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label (e.g., Designer)"
          className={styles.addLabelInput}
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value (e.g., Studio Name)"
          className={styles.addValueInput}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newLabel.trim() || !newValue.trim()}
          className={styles.addButton}
        >
          Add
        </button>
      </div>
    </div>
  );
}
