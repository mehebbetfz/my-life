import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import type { Alarm, AlarmSoundId, Weekday } from '../types';
import { ensureNotificationPermission, cancelNotification } from './notifications';

const ALARM_CHANNEL = 'alarms';

/** запасные файлы для старых будильников */
const SOUND_FILES: Record<'classic' | 'soft' | 'bright' | 'pulse', number> = {
  classic: require('../../assets/sounds/classic.wav'),
  soft: require('../../assets/sounds/soft.wav'),
  bright: require('../../assets/sounds/bright.wav'),
  pulse: require('../../assets/sounds/pulse.wav'),
};

function resolveSoundSource(
  soundId: AlarmSoundId,
  customSoundUri?: string,
): number | { uri: string } {
  if (soundId === 'custom' && customSoundUri) {
    return { uri: customSoundUri };
  }
  if (
    soundId === 'classic' ||
    soundId === 'soft' ||
    soundId === 'bright' ||
    soundId === 'pulse'
  ) {
    return SOUND_FILES[soundId];
  }
  /** системный: в уведомлении — default OS; в приложении — classic как запас */
  return SOUND_FILES.classic;
}

/**
 * Выбор файла мелодии. Native-модуль document-picker должен быть в бинарнике
 * (после сборки с плагином). Импорт lazy — чтобы старые OTA не падали на старте.
 */
export async function pickAlarmSoundFile(): Promise<{
  uri: string;
  name: string;
} | null> {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = await import('expo-file-system/legacy');

    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const base = FileSystem.documentDirectory;
    if (!base) {
      return { uri: asset.uri, name: asset.name || 'Мелодия' };
    }

    const dir = `${base}alarm-sounds/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const safeName = (asset.name || 'melody')
      .replace(/[^\w.\-а-яА-ЯёЁ ]+/gi, '_')
      .slice(0, 80);
    const fromName = /\.[a-z0-9]+$/i.exec(safeName)?.[0];
    const ext =
      fromName ??
      (asset.mimeType?.includes('mpeg') || asset.mimeType?.includes('mp3')
        ? '.mp3'
        : asset.mimeType?.includes('m4a') ||
            asset.mimeType?.includes('mp4') ||
            asset.mimeType?.includes('aac')
          ? '.m4a'
          : asset.mimeType?.includes('wav')
            ? '.wav'
            : '.m4a');
    const dest = `${dir}${Date.now()}_${safeName}${fromName ? '' : ext}`;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    return { uri: dest, name: asset.name || safeName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingNative =
      /native module|cannot find|null is not an object|ExpoDocumentPicker/i.test(
        msg,
      );
    Alert.alert(
      'Мелодия',
      missingNative
        ? 'Выбор трека появится после установки новой версии из TestFlight (нужна пересборка приложения).'
        : `Не удалось открыть файл.\n${msg}`,
    );
    return null;
  }
}

let ringingPlayer: AudioPlayer | null = null;
let hapticTimer: ReturnType<typeof setInterval> | null = null;
let volumeTimer: ReturnType<typeof setInterval> | null = null;

export async function ensureAlarmChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
    name: 'Будильники',
    description: 'Звонки будильника My Life',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 600, 200, 600],
    sound: 'default',
    enableVibrate: true,
    lockscreenVisibility:
      Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

function weekdayToCalendar(day: Weekday): number {
  // our 0=Mon … Expo WEEKLY uses 1=Sunday … 7=Saturday
  return day === 6 ? 1 : day + 2;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

export async function cancelAlarmNotifications(
  alarm: Alarm,
): Promise<void> {
  for (const id of alarm.notificationIds ?? []) {
    await cancelNotification(id);
  }
}

export async function scheduleAlarm(
  alarm: Alarm,
): Promise<string[]> {
  await cancelAlarmNotifications(alarm);
  if (!alarm.enabled) return [];

  const ok = await ensureNotificationPermission();
  if (!ok) return [];
  await ensureAlarmChannel();

  const { hour, minute } = parseTime(alarm.time);
  const days =
    alarm.days.length === 0
      ? ([0, 1, 2, 3, 4, 5, 6] as Weekday[])
      : alarm.days;

  const ids: string[] = [];
  for (const day of days) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'Будильник',
        body: alarm.time,
        /** кастомный файл нельзя положить в бандл на лету — в баннере системный звук */
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'alarm',
          alarmId: alarm.id,
          soundId: alarm.soundId,
          customSoundUri: alarm.customSoundUri,
          vibrate: alarm.vibrate,
          playInSilent: alarm.playInSilent,
          gradualVolume: alarm.gradualVolume,
          volume: alarm.volume,
          snoozeMinutes: alarm.snoozeMinutes,
        },
        ...(Platform.OS === 'android'
          ? { channelId: ALARM_CHANNEL }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: weekdayToCalendar(day),
        hour,
        minute,
      },
    });
    ids.push(id);
  }
  return ids;
}

export async function rescheduleAllAlarms(
  alarms: Alarm[],
): Promise<Alarm[]> {
  const next: Alarm[] = [];
  for (const alarm of alarms) {
    const notificationIds = await scheduleAlarm(alarm);
    next.push({ ...alarm, notificationIds });
  }
  return next;
}

export async function startAlarmRinging(opts: {
  soundId: AlarmSoundId;
  customSoundUri?: string;
  vibrate: boolean;
  playInSilent: boolean;
  gradualVolume: boolean;
  volume: number;
}): Promise<void> {
  await stopAlarmRinging();

  await setAudioModeAsync({
    playsInSilentMode: opts.playInSilent,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  });

  const startVol = opts.gradualVolume
    ? Math.min(0.15, opts.volume)
    : opts.volume;

  const source = resolveSoundSource(opts.soundId, opts.customSoundUri);
  ringingPlayer = createAudioPlayer(source);
  ringingPlayer.loop = true;
  ringingPlayer.volume = startVol;
  ringingPlayer.play();

  if (opts.gradualVolume && ringingPlayer) {
    const target = Math.max(0.05, Math.min(1, opts.volume));
    let current = startVol;
    volumeTimer = setInterval(() => {
      current = Math.min(target, current + 0.05);
      if (ringingPlayer) ringingPlayer.volume = current;
      if (current >= target && volumeTimer) {
        clearInterval(volumeTimer);
        volumeTimer = null;
      }
    }, 800);
  }

  if (opts.vibrate) {
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error,
    );
    hapticTimer = setInterval(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 900);
  }
}

export async function stopAlarmRinging(): Promise<void> {
  if (hapticTimer) {
    clearInterval(hapticTimer);
    hapticTimer = null;
  }
  if (volumeTimer) {
    clearInterval(volumeTimer);
    volumeTimer = null;
  }
  if (ringingPlayer) {
    try {
      ringingPlayer.pause();
      ringingPlayer.remove();
    } catch {
      // ignore
    }
    ringingPlayer = null;
  }
}

export async function previewAlarmSound(
  soundId: AlarmSoundId,
  volume = 0.6,
  customSoundUri?: string,
): Promise<void> {
  if (soundId === 'default') {
    await stopAlarmRinging();
    return;
  }
  await stopAlarmRinging();
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
    shouldRouteThroughEarpiece: false,
  });
  const source = resolveSoundSource(soundId, customSoundUri);
  const player = createAudioPlayer(source);
  player.volume = volume;
  player.play();

  const sub = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      sub.remove();
      try {
        player.remove();
      } catch {
        // ignore
      }
    }
  });

  /** обрезка длинных треков при превью */
  setTimeout(() => {
    try {
      sub.remove();
      player.pause();
      player.remove();
    } catch {
      // ignore
    }
  }, 12_000);
}

export async function scheduleSnooze(
  alarm: Alarm,
  minutes: number,
): Promise<string | null> {
  const ok = await ensureNotificationPermission();
  if (!ok) return null;
  await ensureAlarmChannel();
  const when = new Date(Date.now() + minutes * 60_000);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${alarm.label || 'Будильник'} · отложен`,
      body: alarm.time,
      sound: true,
      data: {
        type: 'alarm',
        alarmId: alarm.id,
        soundId: alarm.soundId,
        customSoundUri: alarm.customSoundUri,
        vibrate: alarm.vibrate,
        playInSilent: alarm.playInSilent,
        gradualVolume: alarm.gradualVolume,
        volume: alarm.volume,
        snoozeMinutes: alarm.snoozeMinutes,
      },
      ...(Platform.OS === 'android'
        ? { channelId: ALARM_CHANNEL }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });
}

export function formatAlarmDays(days: Weekday[]): string {
  if (days.length === 0 || days.length === 7) return 'Каждый день';
  const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const sorted = [...days].sort((a, b) => a - b);
  if (
    sorted.length === 5 &&
    sorted.every((d, i) => d === i)
  ) {
    return 'Будни';
  }
  if (sorted.length === 2 && sorted[0] === 5 && sorted[1] === 6) {
    return 'Выходные';
  }
  return sorted.map((d) => labels[d]).join(' ');
}
