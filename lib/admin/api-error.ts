function statusHint(status: number): string {
  if (status === 401) return '401 Unauthorized — please log in again.';
  if (status === 403) return '403 Forbidden.';
  if (status >= 500) return `${status} Server error — try again later.`;
  if (status >= 400) return `${status} Request failed.`;
  return '';
}

export async function getApiErrorMessage(
  response: Response,
  fallback = 'Something went wrong. Please try again.'
): Promise<string> {
  const clone = response.clone();
  let detail: string | null = null;

  try {
    const data = (await response.json()) as {
      error?: string | { message?: string; code?: string };
      message?: string;
    };

    if (typeof data?.error === 'string' && data.error.trim()) {
      detail = data.error;
    } else if (data?.error && typeof data.error === 'object') {
      const message = data.error.message?.trim();
      if (message) detail = message;
      else {
        const code = data.error.code?.trim();
        if (code) detail = `Request failed: ${code}`;
      }
    } else if (typeof data?.message === 'string' && data.message.trim()) {
      detail = data.message;
    }
  } catch {
    // fall through to text parsing
  }

  if (!detail) {
    try {
      const text = (await clone.text()).trim();
      if (text) detail = text;
    } catch {
      // ignore
    }
  }

  const hint = statusHint(response.status);
  const body = detail || fallback;

  if (hint && body.toLowerCase().includes(String(response.status))) {
    return body;
  }

  return hint ? `${hint} ${body}` : body;
}
