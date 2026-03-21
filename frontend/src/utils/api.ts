const API_URL = import.meta.env.VITE_API_URL ?? '/api/analyze';

export async function analyzeArchitecture(description: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
    signal: AbortSignal.timeout(20000), // 20s timeout
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw { status: response.status, message: body.message ?? 'Unknown error' };
  }
  return response.json();
}
