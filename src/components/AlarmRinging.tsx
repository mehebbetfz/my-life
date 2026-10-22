import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import {
  scheduleSnooze,
  startAlarmRinging,
  stopAlarmRinging,
} from '../lib/alarms';
import { colors, fonts, radii, space } from '../theme';
import type { AlarmSoundId } from '../types';

type RingState = {
  alarmId: string;
  label: string;
  time: string;
  soundId: AlarmSoundId;
  customSoundUri?: string;
  vibrate: boolean;
  playInSilent: boolean;
  gradualVolume: boolean;
  volume: number;
  snoozeMinutes: number;
};

export function AlarmRinging() {
  const insets = useSafeAreaInsets();
  const { getAlarm } = useData();
  const [ring, setRing] = useState<RingState | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const subRecv = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<
          string,
          unknown
        >;
        if (data?.type !== 'alarm') return;
        void openRing(data);
      },
    );
    const subResp = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        if (data?.type !== 'alarm') return;
        void openRing(data);
      },
    );
    return () => {
      subRecv.remove();
      subResp.remove();
      void stopAlarmRinging();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ring) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [ring]);

  const openRing = async (data: Record<string, unknown>) => {
    const alarmId = String(data.alarmId ?? '');
    const alarm = getAlarm(alarmId);
    const state: RingState = {
      alarmId,
      label: alarm?.label || 'Будильник',
      time: alarm?.time || '',
      soundId: (data.soundId as AlarmSoundId) || alarm?.soundId || 'default',
      customSoundUri:
        (typeof data.customSoundUri === 'string'
          ? data.customSoundUri
          : undefined) || alarm?.customSoundUri,
      vibrate: Boolean(data.vibrate ?? alarm?.vibrate ?? true),
      playInSilent: Boolean(
        data.playInSilent ?? alarm?.playInSilent ?? true,
      ),
      gradualVolume: Boolean(
        data.gradualVolume ?? alarm?.gradualVolume ?? true,
      ),
      volume: Number(data.volume ?? alarm?.volume ?? 1),
      snoozeMinutes: Number(
        data.snoozeMinutes ?? alarm?.snoozeMinutes ?? 10,
      ),
    };
    setRing(state);
    setNow(new Date());
    await startAlarmRinging(state);
  };

  const dismiss = async () => {
    await stopAlarmRinging();
    setRing(null);
  };

  const snooze = async () => {
    if (!ring) return;
    const alarm = getAlarm(ring.alarmId);
    if (alarm) {
      await scheduleSnooze(alarm, ring.snoozeMinutes);
    }
    await dismiss();
  };

  if (!ring) return null;

  const clock = now.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <Text style={styles.label}>{ring.label}</Text>
        <Text style={styles.clock}>{clock}</Text>
        <Text style={styles.sub}>
          {ring.time ? `Завод · ${ring.time}` : 'Будильник'}
        </Text>

        <View style={styles.actions}>
          <Pressable style={styles.snooze} onPress={() => void snooze()}>
            <Text style={styles.snoozeText}>
              +{ring.snoozeMinutes} мин
            </Text>
          </Pressable>
          <Pressable style={styles.dismiss} onPress={() => void dismiss()}>
            <Text style={styles.dismissText}>Выключить</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 18,
    color: 'rgba(255,255,255,0.75)',
  },
  clock: {
    marginTop: 12,
    fontFamily: fonts.serif,
    fontSize: 84,
    lineHeight: 92,
    color: '#fff',
    letterSpacing: -2,
  },
  sub: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
  },
  actions: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    gap: 12,
  },
  snooze: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  snoozeText: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: '#fff',
  },
  dismiss: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.accent,
  },
});
