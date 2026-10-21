/**
 * Клиент для будущего бэкенда на том же сервере, что и top-academy-learn.
 * Пока приложение работает офлайн через AsyncStorage.
 * Когда API будет готов — укажи EXPO_PUBLIC_API_URL в .env.
 */

const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export function isApiConfigured(): boolean {
  return Boolean(baseUrl);
}

export async function apiHealth(): Promise<{ ok: boolean; message: string }> {
  if (!baseUrl) {
    return { ok: false, message: 'API не настроен (локальный режим)' };
  }
  try {
    const res = await fetch(`${baseUrl}/health`);
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    return { ok: true, message: 'Сервер доступен' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Ошибка сети' };
  }
}
