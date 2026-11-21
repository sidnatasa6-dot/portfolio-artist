// У production адреса береться зі змінної VITE_API_URL (вшивається під час збірки),
// а локально використовується порожній рядок — запити /api/... перехоплює proxy Vite
const API_URL = import.meta.env.VITE_API_URL ?? '';

const TOKEN_KEY = 'token';
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

export async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { data: null, total: null };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const details = data?.details ? `: ${data.details.join('; ')}` : '';
    const error = new Error((data?.error ?? `Помилка ${res.status}`) + details);
    error.status = res.status;
    throw error;
  }
  return { data, total: Number(res.headers.get('X-Total-Count')) || null };
}
