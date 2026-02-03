export async function getApiErrorMessage(
  response: Response,
  fallback = 'Something went wrong. Please try again.'
): Promise<string> {
  const clone = response.clone();

  try {
    const data = (await response.json()) as {
      error?: string | { message?: string; code?: string };
      message?: string;
    };

    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error;
    }

    if (data?.error && typeof data.error === 'object') {
      const message = data.error.message?.trim();
      if (message) return message;
      const code = data.error.code?.trim();
      if (code) return `Request failed: ${code}`;
    }

    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
  } catch {
    // fall through to text parsing
  }

  try {
    const text = (await clone.text()).trim();
    if (text) return text;
  } catch {
    // ignore
  }

  return fallback;
}
