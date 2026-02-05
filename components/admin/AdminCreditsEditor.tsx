'use client';

import { useState } from 'react';
import type { ProjectCredit } from '@/types';

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
    <div className="space-y-4">
      {/* Existing Credits */}
      {credits.length > 0 && (
        <div className="space-y-2">
          {credits.map((credit, index) => (
            <div
              key={`${credit.label}-${index}`}
              className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 p-2"
            >
              <input
                type="text"
                value={credit.label}
                onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                placeholder="Label"
                className="w-32 rounded-lg border border-black/20 px-3 py-1.5 text-sm"
              />
              <input
                type="text"
                value={credit.value}
                onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 rounded-lg border border-black/20 px-3 py-1.5 text-sm"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black/70 disabled:opacity-30"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === credits.length - 1}
                  className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black/70 disabled:opacity-30"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="rounded-lg p-1.5 text-black/40 hover:bg-red-50 hover:text-red-600"
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
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label (e.g., Designer)"
          className="w-40 rounded-xl border border-black/20 px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value (e.g., Studio Name)"
          className="flex-1 rounded-xl border border-black/20 px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newLabel.trim() || !newValue.trim()}
          className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-black/70 hover:border-black/40 hover:text-black disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
