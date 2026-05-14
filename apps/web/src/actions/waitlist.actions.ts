const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function joinWaitlistAction(data: {
  email: string;
  name?: string;
  source?: string;
}) {
  const res = await fetch(`${API_URL}/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { response: { data: err } };
  }

  return res.json() as Promise<{ success: boolean; position: number; alreadyJoined?: boolean }>;
}

export async function getWaitlistCountAction() {
  const res = await fetch(`${API_URL}/waitlist/count`);
  if (!res.ok) throw new Error('Failed to fetch count');
  return res.json() as Promise<number>;
}
