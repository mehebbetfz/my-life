import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';

export type OtaStatus = {
  enabled: boolean;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  createdAt: string | null;
  isEmbedded: boolean;
};

export function getOtaStatus(): OtaStatus {
  const enabled = Updates.isEnabled;
  return {
    enabled,
    channel: Updates.channel ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    updateId: Updates.updateId ?? null,
    createdAt: Updates.createdAt
      ? Updates.createdAt.toISOString()
      : null,
    isEmbedded: Updates.isEmbeddedLaunch,
  };
}

export type CheckResult =
  | { kind: 'disabled' }
  | { kind: 'up-to-date' }
  | { kind: 'available'; manifestId?: string }
  | { kind: 'error'; message: string };

/** Check server for a newer OTA bundle */
export async function checkForOtaUpdate(): Promise<CheckResult> {
  if (__DEV__ || !Updates.isEnabled) {
    return { kind: 'disabled' };
  }
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return { kind: 'up-to-date' };
    return {
      kind: 'available',
      manifestId: result.manifest?.id,
    };
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Ошибка проверки',
    };
  }
}

/** Download and apply update (reloads app) */
export async function downloadAndApplyOta(): Promise<CheckResult> {
  if (__DEV__ || !Updates.isEnabled) {
    return { kind: 'disabled' };
  }
  try {
    const result = await Updates.fetchUpdateAsync();
    if (!result.isNew) {
      /** уже скачано ранее — просто перезапуск */
      try {
        await Updates.reloadAsync();
      } catch {
        /* процесс умирает при reload — это нормально */
      }
      return { kind: 'available' };
    }
    try {
      await Updates.reloadAsync();
    } catch {
      /* reload прерывает JS */
    }
    return { kind: 'available' };
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Ошибка загрузки',
    };
  }
}

/** Silent check on launch: fetch in background, apply next cold start (or reload now) */
export async function syncOtaOnLaunch(opts?: {
  reloadImmediately?: boolean;
}): Promise<CheckResult> {
  const check = await checkForOtaUpdate();
  if (check.kind !== 'available') return check;
  try {
    const fetched = await Updates.fetchUpdateAsync();
    if (!fetched.isNew) return { kind: 'up-to-date' };
    if (opts?.reloadImmediately) {
      await Updates.reloadAsync();
    }
    return { kind: 'available', manifestId: fetched.manifest?.id };
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Ошибка загрузки',
    };
  }
}

export function explainOtaDisabled(): string {
  if (__DEV__) {
    return 'В Expo Go / dev-режиме OTA отключён. Работает в preview/production сборке (TestFlight).';
  }
  if (Platform.OS === 'web') {
    return 'OTA недоступен в веб-версии.';
  }
  return 'Обновления отключены в этой сборке.';
}

export async function promptCheckAndUpdate(): Promise<void> {
  const check = await checkForOtaUpdate();
  if (check.kind === 'disabled') {
    Alert.alert('OTA', explainOtaDisabled());
    return;
  }
  if (check.kind === 'error') {
    Alert.alert('Ошибка', check.message);
    return;
  }
  if (check.kind === 'up-to-date') {
    Alert.alert('Актуально', 'Установлена последняя версия.');
    return;
  }
  Alert.alert(
    'Есть обновление',
    'Скачать и перезапустить приложение сейчас?',
    [
      { text: 'Позже', style: 'cancel' },
      {
        text: 'Обновить',
        onPress: () => {
          void downloadAndApplyOta().then((r) => {
            if (r.kind === 'error') Alert.alert('Ошибка', r.message);
          });
        },
      },
    ],
  );
}
