import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { DateTimeField } from '../components/DateTimeField';
import { Icon } from '../components/Icon';
import {
  Chip,
  EmptyHint,
  Field,
  Header,
  IconButton,
  PrimaryButton,
  Row,
  Screen,
  SectionLabel,
} from '../components/ui';
import { useData } from '../context/DataContext';
import {
  formatAlarmDays,
  pickAlarmSoundFile,
  previewAlarmSound,
} from '../lib/alarms';
import { colors, fonts, radii, space } from '../theme';
import {
  ALARM_SOUNDS,
  WEEKDAY_LABELS,
  type Alarm,
  type AlarmSoundId,
  type Weekday,
} from '../types';

type Draft = {
  label: string;
  time: Date;
  days: Weekday[];
  soundId: AlarmSoundId;
  customSoundUri?: string;
  customSoundName?: string;
  vibrate: boolean;
  playInSilent: boolean;
  gradualVolume: boolean;
  volume: number;
  snoozeMinutes: 5 | 10 | 15 | 20;
};

function timeToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const emptyDraft = (): Draft => ({
  label: 'Будильник',
  time: (() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  })(),
  days: [],
  soundId: 'default',
  customSoundUri: undefined,
  customSoundName: undefined,
  vibrate: true,
  playInSilent: true,
  gradualVolume: true,
  volume: 1,
  snoozeMinutes: 10,
});

export function AlarmsScreen() {
  const { data, addAlarm, updateAlarm, toggleAlarm, removeAlarm } =
    useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const alarms = useMemo(
    () =>
      [...(data.alarms ?? [])].sort((a, b) =>
        a.time.localeCompare(b.time),
      ),
    [data.alarms],
  );

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setShowForm(true);
  };

  const openEdit = (alarm: Alarm) => {
    setEditingId(alarm.id);
    setDraft({
      label: alarm.label,
      time: timeToDate(alarm.time),
      days: [...alarm.days],
      soundId:
        alarm.soundId === 'custom' || alarm.soundId === 'default'
          ? alarm.soundId
          : alarm.customSoundUri
            ? 'custom'
            : 'default',
      customSoundUri: alarm.customSoundUri,
      customSoundName: alarm.customSoundName,
      vibrate: alarm.vibrate,
      playInSilent: alarm.playInSilent,
      gradualVolume: alarm.gradualVolume,
      volume: alarm.volume,
      snoozeMinutes: alarm.snoozeMinutes,
    });
    setShowForm(true);
  };

  const toggleDay = (day: Weekday) => {
    setDraft((prev) => {
      const has = prev.days.includes(day);
      return {
        ...prev,
        days: has
          ? prev.days.filter((d) => d !== day)
          : [...prev.days, day].sort((a, b) => a - b),
      };
    });
  };

  const onSave = async () => {
    if (draft.soundId === 'custom' && !draft.customSoundUri) {
      Alert.alert('Звук', 'Выбери файл мелодии или системный звук.');
      return;
    }
    const payload = {
      label: draft.label.trim() || 'Будильник',
      time: dateToTime(draft.time),
      days: draft.days,
      soundId: draft.soundId,
      customSoundUri:
        draft.soundId === 'custom' ? draft.customSoundUri : undefined,
      customSoundName:
        draft.soundId === 'custom' ? draft.customSoundName : undefined,
      vibrate: draft.vibrate,
      playInSilent: draft.playInSilent,
      gradualVolume: draft.gradualVolume,
      volume: draft.volume,
      snoozeMinutes: draft.snoozeMinutes,
    };
    if (editingId) {
      await updateAlarm(editingId, payload);
    } else {
      await addAlarm(payload);
    }
    setShowForm(false);
  };

  return (
    <Screen>
      <Header
        title="Будильник"
        subtitle="Системный звук или свой трек"
        right={
          <IconButton name="plus" onPress={openCreate} />
        }
      />

      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Будильник' : 'Новый будильник'}
        footer={
          <PrimaryButton
            label={editingId ? 'Сохранить' : 'Создать будильник'}
            icon="check"
            onPress={() => void onSave()}
          />
        }
      >
        <Field
          placeholder="Название"
          value={draft.label}
          onChangeText={(label) => setDraft((d) => ({ ...d, label }))}
        />
        <DateTimeField
          label="Время"
          mode="time"
          value={draft.time}
          onChange={(time) => setDraft((d) => ({ ...d, time }))}
        />

        <SectionLabel>Повтор</SectionLabel>
        <View style={styles.days}>
          {WEEKDAY_LABELS.map((label, i) => {
            const day = i as Weekday;
            const on = draft.days.includes(day);
            return (
              <Pressable
                key={label}
                onPress={() => toggleDay(day)}
                style={[styles.day, on && styles.dayOn]}
              >
                <Text style={[styles.dayText, on && styles.dayTextOn]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.rowChips}>
          <Chip
            label="Будни"
            selected={
              draft.days.length === 5 &&
              draft.days.every((d, i) => d === i)
            }
            onPress={() =>
              setDraft((d) => ({
                ...d,
                days: [0, 1, 2, 3, 4],
              }))
            }
          />
          <Chip
            label="Выходные"
            selected={
              draft.days.length === 2 &&
              draft.days[0] === 5 &&
              draft.days[1] === 6
            }
            onPress={() =>
              setDraft((d) => ({ ...d, days: [5, 6] }))
            }
          />
          <Chip
            label="Каждый день"
            selected={draft.days.length === 0}
            onPress={() => setDraft((d) => ({ ...d, days: [] }))}
          />
        </View>

        <SectionLabel>Звук</SectionLabel>
        {ALARM_SOUNDS.map((s) => {
          const selected = draft.soundId === s.id;
          const isCustom = s.id === 'custom';
          return (
            <Pressable
              key={s.id}
              style={[styles.soundRow, selected && styles.soundOn]}
              onPress={() => {
                if (isCustom) {
                  void (async () => {
                    const picked = await pickAlarmSoundFile();
                    if (!picked) return;
                    setDraft((d) => ({
                      ...d,
                      soundId: 'custom',
                      customSoundUri: picked.uri,
                      customSoundName: picked.name,
                    }));
                    void previewAlarmSound(
                      'custom',
                      draft.volume,
                      picked.uri,
                    );
                  })();
                  return;
                }
                setDraft((d) => ({
                  ...d,
                  soundId: 'default',
                  customSoundUri: undefined,
                  customSoundName: undefined,
                }));
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.soundTitle}>{s.title}</Text>
                <Text style={styles.soundHint}>
                  {isCustom && draft.customSoundName
                    ? draft.customSoundName
                    : s.hint}
                </Text>
              </View>
              <Icon
                name={
                  isCustom
                    ? 'folder'
                    : selected
                      ? 'check-circle'
                      : 'bell'
                }
                size={18}
                color={selected ? colors.accent : colors.faint}
              />
            </Pressable>
          );
        })}
        {draft.soundId === 'custom' && draft.customSoundUri ? (
          <PrimaryButton
            label="Прослушать"
            icon="play"
            variant="soft"
            onPress={() =>
              void previewAlarmSound(
                'custom',
                draft.volume,
                draft.customSoundUri,
              )
            }
          />
        ) : null}

        <SectionLabel>Громкость {Math.round(draft.volume * 100)}%</SectionLabel>
        <View style={styles.rowChips}>
          {[0.4, 0.7, 1].map((v) => (
            <Chip
              key={v}
              label={`${Math.round(v * 100)}%`}
              selected={draft.volume === v}
              onPress={() => setDraft((d) => ({ ...d, volume: v }))}
            />
          ))}
        </View>

        <SectionLabel>Отложить</SectionLabel>
        <View style={styles.rowChips}>
          {([5, 10, 15, 20] as const).map((m) => (
            <Chip
              key={m}
              label={`${m} мин`}
              selected={draft.snoozeMinutes === m}
              onPress={() =>
                setDraft((d) => ({ ...d, snoozeMinutes: m }))
              }
            />
          ))}
        </View>

        <Toggle
          label="Вибрация"
          value={draft.vibrate}
          onChange={(vibrate) => setDraft((d) => ({ ...d, vibrate }))}
        />
        <Toggle
          label="Звук в беззвучном режиме"
          value={draft.playInSilent}
          onChange={(playInSilent) =>
            setDraft((d) => ({ ...d, playInSilent }))
          }
        />
        <Toggle
          label="Нарастающая громкость"
          value={draft.gradualVolume}
          onChange={(gradualVolume) =>
            setDraft((d) => ({ ...d, gradualVolume }))
          }
        />
      </BottomSheet>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {alarms.length === 0 && (
          <EmptyHint>
            Создай будильник — время, дни, звук телефона и snooze.
          </EmptyHint>
        )}

        {alarms.map((alarm) => (
            <Row
              key={alarm.id}
              onPress={() => openEdit(alarm)}
              onLongPress={() =>
                Alert.alert('Удалить будильник?', alarm.label, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => void removeAlarm(alarm.id),
                  },
                ])
              }
            >
              <View style={styles.alarmRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.alarmTime,
                      !alarm.enabled && styles.dim,
                    ]}
                  >
                    {alarm.time}
                  </Text>
                  <Text style={styles.alarmMeta}>
                    {alarm.label} · {formatAlarmDays(alarm.days)}
                  </Text>
                  <Text style={styles.alarmMeta}>
                    {alarm.soundId === 'custom'
                      ? alarm.customSoundName || 'Свой трек'
                      : 'Системный'}
                    {alarm.vibrate ? ' · вибрация' : ''}
                    {` · snooze ${alarm.snoozeMinutes}м`}
                  </Text>
                </View>
                <Switch
                  value={alarm.enabled}
                  onValueChange={() => void toggleAlarm(alarm.id)}
                  trackColor={{ false: colors.line, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>
            </Row>
          ))}
      </ScrollView>
    </Screen>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  dayOn: { backgroundColor: colors.accent },
  dayText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.ink,
  },
  dayTextOn: { color: '#fff' },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap' },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    marginBottom: 6,
    backgroundColor: colors.bg,
  },
  soundOn: { backgroundColor: colors.accentSoft },
  soundTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
  },
  soundHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleLabel: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
    marginRight: 12,
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alarmTime: {
    fontFamily: fonts.serif,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  dim: { color: colors.faint },
  alarmMeta: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
});
