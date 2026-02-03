const MODEL_KEY = 'sgoodie.admin.aiModel';

export function loadAiModel(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(MODEL_KEY);
}

export function saveAiModel(model: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODEL_KEY, model);
}
