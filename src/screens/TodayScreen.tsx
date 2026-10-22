import React, { useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  PriorityFlag,
  priorityMeta,
} from '../components/PriorityPicker';
import {
  Check,
  EmptyHint,
  Header,
  Row,
  Screen,
  SectionLabel,
} from '../components/ui';
import { useData } from '../context/DataContext';
import { DEFAULT_BASE_CURRENCY } from '../lib/currency';
import { isHabitOkOn } from '../lib/habits';
import { formatMoney, monthKey, todayIso } from '../lib/storage';
import { colors, fonts, radii, space } from '../theme';
import { LIFE_AREAS } from '../types';

export function TodayScreen() {
  const { data, toggleTask, markHabitMiss, clearHabitMiss } = useData();
  const baseCurrency = data.baseCurrency ?? DEFAULT_BASE_CURRENCY;
  const today = todayIso();
  const month = today.slice(0, 7);

  const openTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => !t.done && (!t.dueDate || t.dueDate <= today))
        .slice(0, 6),
    [data.tasks, today],
  );

  const events = useMemo(
    () =>
      data.events
        .filter((e) => e.date === today)
        .sort((a, b) =>
          (a.startTime ?? '').localeCompare(b.startTime ?? ''),
        ),
    [data.events, today],
  );

  const monthSpend = useMemo(
    () =>
      data.expenses
        .filter((e) => monthKey(e.date) === month)
        .reduce((s, e) => s + e.amount, 0),
    [data.expenses, month],
  );

  const doneHabits = data.habits.filter((h) =>
    isHabitOkOn(h, today),
  ).length;

  const onHabitPress = (id: string, done: boolean) => {
    if (done) {
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Нарушение',
          'Почему не выполнил?',
          (text) => {
            if (text == null) return;
            markHabitMiss(id, today, text.trim() || 'Не выполнено');
          },
          'plain-text',
        );
      } else {
        Alert.alert('Отметить срыв?', 'Привычка станет красной на сегодня.', [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Срыв',
            style: 'destructive',
            onPress: () => markHabitMiss(id, today, 'Не выполнено'),
          },
        ]);
      }
      return;
    }
    clearHabitMiss(id, today);
  };

  const dateLine = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen>
      <Header title="Сегодня" subtitle={dateLine} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.metrics}>
          <Metric value={String(openTasks.length)} label="задачи" />
          <Metric value={String(events.length)} label="события" />
          <Metric
            value={`${doneHabits}/${data.habits.length || 0}`}
            label="привычки"
          />
        </View>

        <Text style={styles.spendHint}>
          Месяц · {formatMoney(monthSpend, baseCurrency)}
        </Text>

        <SectionLabel>Привычки</SectionLabel>
        {data.habits.length === 0 ? (
          <EmptyHint>Добавь привычки в разделе «Ещё».</EmptyHint>
        ) : (
          data.habits.map((h) => {
            const done = isHabitOkOn(h, today);
            const area = LIFE_AREAS.find((a) => a.id === h.areaId);
            return (
              <Row key={h.id} onPress={() => onHabitPress(h.id, done)}>
                <View style={styles.line}>
                  <Check done={done} />
                  <View style={styles.lineBody}>
                    <Text
                      style={[styles.itemTitle, !done && styles.doneText]}
                    >
                      {h.title}
                    </Text>
                    <Text style={styles.meta}>
                      {area?.title}
                      {h.remindAt ? ` · ${h.remindAt}` : ''}
                      {done ? '' : ' · срыв'}
                    </Text>
                  </View>
                </View>
              </Row>
            );
          })
        )}

        <SectionLabel>События</SectionLabel>
        {events.length === 0 ? (
          <EmptyHint>Свободный день — событий нет.</EmptyHint>
        ) : (
          events.map((e) => (
            <Row key={e.id}>
              <Text style={styles.itemTitle}>{e.title}</Text>
              <Text style={styles.meta}>
                {e.allDay
                  ? 'Весь день'
                  : `${e.startTime ?? ''}${e.endTime ? `–${e.endTime}` : ''}`}
              </Text>
            </Row>
          ))
        )}

        <SectionLabel>Задачи</SectionLabel>
        {openTasks.length === 0 ? (
          <EmptyHint>Всё закрыто. Можно выдохнуть.</EmptyHint>
        ) : (
          openTasks.map((item) => {
            const area = LIFE_AREAS.find((a) => a.id === item.areaId);
            return (
              <Row key={item.id} onPress={() => void toggleTask(item.id)}>
                <View style={styles.line}>
                  <Check />
                  <View style={styles.lineBody}>
                    <View style={styles.titleRow}>
                      <PriorityFlag priority={item.priority} />
                      <Text style={styles.itemTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {priorityMeta(item.priority).title}
                      {area ? ` · ${area.title}` : ''}
                      {item.dueDate ? ` · ${item.dueDate}` : ''}
                    </Text>
                  </View>
                </View>
              </Row>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.ink,
  },
  metricLabel: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.faint,
  },
  spendHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    marginBottom: space.sm,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineBody: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },
  doneText: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
});
