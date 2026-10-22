import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { DateTimeField } from '../components/DateTimeField';
import { Header, PrimaryButton, Row, Screen } from '../components/ui';
import { useData } from '../context/DataContext';
import { colors, fonts } from '../theme';

export function NotificationsScreen() {
  const { data, updateSettings, requestNotifications } = useData();
  const settings = data.settings;
  const [briefing, setBriefing] = useState(() => {
    const [h, m] = settings.dailyBriefingAt.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  });

  const enableAll = async () => {
    const ok = await requestNotifications();
    if (!ok) {
      Alert.alert(
        'Нет доступа',
        'Разреши уведомления в настройках iPhone.',
      );
      return;
    }
    await updateSettings({ enabled: true });
  };

  return (
    <Screen>
      <Header title="Уведомления" subtitle="Локальные напоминания" />

      <Toggle
        label="Включить"
        value={settings.enabled}
        onChange={(v) => {
          if (v) void enableAll();
          else void updateSettings({ enabled: false });
        }}
      />
      <Toggle
        label="Задачи"
        value={settings.taskReminders}
        onChange={(v) => void updateSettings({ taskReminders: v })}
      />
      <Toggle
        label="События"
        value={settings.eventReminders}
        onChange={(v) => void updateSettings({ eventReminders: v })}
      />
      <Toggle
        label="Привычки"
        value={settings.habitReminders}
        onChange={(v) => void updateSettings({ habitReminders: v })}
      />

      <DateTimeField
        label="Ежедневный брифинг"
        mode="time"
        value={briefing}
        onChange={(d) => {
          setBriefing(d);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          void updateSettings({ dailyBriefingAt: `${hh}:${mm}` });
        }}
      />

      <PrimaryButton
        label="Запросить разрешение"
        icon="bell"
        variant="soft"
        onPress={() => void enableAll()}
      />
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
    <Row>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.line, true: colors.accent }}
          thumbColor="#fff"
        />
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    flex: 1,
  },
});
