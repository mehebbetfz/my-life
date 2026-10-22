import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { DateTimeField } from '../components/DateTimeField';
import { Icon, type IconName } from '../components/Icon';
import {
  Header,
  PrimaryButton,
  Row,
  Screen,
} from '../components/ui';
import { useData } from '../context/DataContext';
import {
  explainOtaDisabled,
  getOtaStatus,
  promptCheckAndUpdate,
} from '../lib/ota';
import { colors, fonts, radii, space } from '../theme';
import { AreasScreen } from './AreasScreen';
import { GoalsScreen } from './GoalsScreen';
import { HabitsScreen } from './HabitsScreen';

type Section =
  | 'menu'
  | 'goals'
  | 'habits'
  | 'areas'
  | 'notifications'
  | 'updates';

const MENU: {
  id: Exclude<Section, 'menu'>;
  title: string;
  hint: string;
  icon: IconName;
}[] = [
  {
    id: 'goals',
    title: 'Цели',
    hint: 'Долгосрочные ориентиры',
    icon: 'target',
  },
  {
    id: 'habits',
    title: 'Привычки',
    hint: 'Ритуалы и серии дней',
    icon: 'repeat',
  },
  {
    id: 'areas',
    title: 'Сферы жизни',
    hint: 'Баланс внимания',
    icon: 'layers',
  },
  {
    id: 'notifications',
    title: 'Уведомления',
    hint: 'Напоминания и брифинг',
    icon: 'bell',
  },
  {
    id: 'updates',
    title: 'Обновления',
    hint: 'OTA без App Store',
    icon: 'download-cloud',
  },
];

export function MoreScreen() {
  const [section, setSection] = useState<Section>('menu');
  const { data, updateSettings, requestNotifications } = useData();

  if (section === 'goals') {
    return (
      <Nested onBack={() => setSection('menu')}>
        <GoalsScreen />
      </Nested>
    );
  }
  if (section === 'habits') {
    return (
      <Nested onBack={() => setSection('menu')}>
        <HabitsScreen />
      </Nested>
    );
  }
  if (section === 'areas') {
    return (
      <Nested onBack={() => setSection('menu')}>
        <AreasScreen />
      </Nested>
    );
  }
  if (section === 'notifications') {
    return (
      <NotificationsSection
        onBack={() => setSection('menu')}
        settings={data.settings}
        onUpdate={updateSettings}
        onRequest={requestNotifications}
      />
    );
  }
  if (section === 'updates') {
    return <UpdatesSection onBack={() => setSection('menu')} />;
  }

  return (
    <Screen>
      <Header title="Ещё" subtitle="Настройки и разделы" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {MENU.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSection(item.id)}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.menuIcon}>
              <Icon name={item.icon} size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuHint}>{item.hint}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.faint} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

function Nested({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pressable onPress={onBack} style={styles.back}>
        <Icon name="arrow-left" size={18} color={colors.accent} />
        <Text style={styles.backText}>Назад</Text>
      </Pressable>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

function NotificationsSection({
  onBack,
  settings,
  onUpdate,
  onRequest,
}: {
  onBack: () => void;
  settings: {
    enabled: boolean;
    dailyBriefingAt: string;
    habitReminders: boolean;
    taskReminders: boolean;
    eventReminders: boolean;
  };
  onUpdate: (
    patch: Partial<{
      enabled: boolean;
      dailyBriefingAt: string;
      habitReminders: boolean;
      taskReminders: boolean;
      eventReminders: boolean;
    }>,
  ) => Promise<void>;
  onRequest: () => Promise<boolean>;
}) {
  const [briefing, setBriefing] = useState(() => {
    const [h, m] = settings.dailyBriefingAt.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  });

  const enableAll = async () => {
    const ok = await onRequest();
    if (!ok) {
      Alert.alert(
        'Нет доступа',
        'Разреши уведомления в настройках iPhone.',
      );
      return;
    }
    await onUpdate({ enabled: true });
  };

  return (
    <Screen>
      <Pressable onPress={onBack} style={styles.backInline}>
        <Icon name="arrow-left" size={18} color={colors.accent} />
        <Text style={styles.backText}>Назад</Text>
      </Pressable>
      <Header title="Уведомления" subtitle="Локальные напоминания" />

      <Toggle
        label="Включить"
        value={settings.enabled}
        onChange={(v) => {
          if (v) void enableAll();
          else void onUpdate({ enabled: false });
        }}
      />
      <Toggle
        label="Задачи"
        value={settings.taskReminders}
        onChange={(v) => void onUpdate({ taskReminders: v })}
      />
      <Toggle
        label="События"
        value={settings.eventReminders}
        onChange={(v) => void onUpdate({ eventReminders: v })}
      />
      <Toggle
        label="Привычки"
        value={settings.habitReminders}
        onChange={(v) => void onUpdate({ habitReminders: v })}
      />

      <DateTimeField
        label="Ежедневный брифинг"
        mode="time"
        value={briefing}
        onChange={(d) => {
          setBriefing(d);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          void onUpdate({ dailyBriefingAt: `${hh}:${mm}` });
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

function UpdatesSection({ onBack }: { onBack: () => void }) {
  const status = getOtaStatus();
  const [busy, setBusy] = useState(false);

  return (
    <Screen>
      <Pressable onPress={onBack} style={styles.backInline}>
        <Icon name="arrow-left" size={18} color={colors.accent} />
        <Text style={styles.backText}>Назад</Text>
      </Pressable>
      <Header
        title="Обновления"
        subtitle="EAS Update · без новой сборки"
      />

      <Row>
        <Text style={styles.metaLine}>
          {status.enabled
            ? 'OTA активны в этой сборке'
            : explainOtaDisabled()}
        </Text>
        {status.channel ? (
          <Text style={styles.metaLine}>Канал · {status.channel}</Text>
        ) : null}
        {status.runtimeVersion ? (
          <Text style={styles.metaLine}>
            Runtime · {status.runtimeVersion}
          </Text>
        ) : null}
        <Text style={styles.metaLine}>
          {status.isEmbedded ? 'Встроенный бандл' : 'OTA-бандл'}
        </Text>
      </Row>

      <PrimaryButton
        label={busy ? 'Проверяю…' : 'Проверить обновления'}
        icon="refresh-cw"
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void promptCheckAndUpdate().finally(() => setBusy(false));
        }}
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
  },
  menuHint: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.xl,
    paddingTop: space.xl + 8,
    paddingBottom: space.sm,
    backgroundColor: colors.bg,
  },
  backInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: space.sm,
    marginTop: space.xs,
  },
  backText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.accent,
  },
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
  metaLine: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.ink,
    marginBottom: 6,
    lineHeight: 20,
  },
});
