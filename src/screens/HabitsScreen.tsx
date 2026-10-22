import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { DateTimeField } from '../components/DateTimeField';
import {
  Chip,
  EmptyHint,
  Field,
  Header,
  IconButton,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { useData } from '../context/DataContext';
import {
  countHabitStreak,
  getMiss,
  habitDayKind,
  monthGrid,
  monthsBack,
} from '../lib/habits';
import { todayIso } from '../lib/storage';
import { colors, fonts, radii, space } from '../theme';
import { LIFE_AREAS, type Habit, type LifeAreaId } from '../types';

const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const GAP = 4;

export function HabitsScreen() {
  const {
    data,
    addHabit,
    removeHabit,
    markHabitMiss,
    clearHabitMiss,
  } = useData();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<LifeAreaId>('health');
  const [withRemind, setWithRemind] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [missDate, setMissDate] = useState<string | null>(null);
  const [missReason, setMissReason] = useState('');
  const [remind, setRemind] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const today = todayIso();
  const months = useMemo(() => monthsBack(6), []);

  const selected = useMemo(
    () => data.habits.find((h) => h.id === selectedId) ?? null,
    [data.habits, selectedId],
  );

  const onAdd = () => {
    if (!title.trim()) return;
    const remindAt = withRemind
      ? `${String(remind.getHours()).padStart(2, '0')}:${String(remind.getMinutes()).padStart(2, '0')}`
      : undefined;
    void addHabit(title, areaId, remindAt);
    setTitle('');
    setWithRemind(false);
    setShowForm(false);
  };

  const openDay = (habit: Habit, date: string) => {
    const kind = habitDayKind(habit, date);
    if (kind === 'future' || kind === 'empty') return;
    if (kind === 'missed') {
      const miss = getMiss(habit, date);
      Alert.alert(
        date,
        miss?.reason ?? 'Нарушение',
        [
          { text: 'Закрыть', style: 'cancel' },
          {
            text: 'Снять нарушение',
            onPress: () => clearHabitMiss(habit.id, date),
          },
        ],
      );
      return;
    }
    setMissDate(date);
    setMissReason('');
  };

  const saveMiss = () => {
    if (!selectedId || !missDate) return;
    if (!missReason.trim()) {
      Alert.alert('Причина', 'Укажи, почему привычка нарушена');
      return;
    }
    markHabitMiss(selectedId, missDate, missReason);
    setMissDate(null);
    setMissReason('');
  };

  const { width: winW } = useWindowDimensions();
  /** 7 колонок на всю ширину экрана (с учётом padding Screen) */
  const cell = Math.floor((winW - space.xl * 2 - GAP * 6) / 7);

  if (selected) {
    const area = LIFE_AREAS.find((a) => a.id === selected.areaId);
    const streak = countHabitStreak(selected);
    const missCount = (selected.misses ?? []).length;

    return (
      <Screen>
        <Header
          title={selected.title}
          subtitle={area?.title ?? 'Календарь'}
          showMenu={false}
          right={<View style={{ width: 40 }} />}
        />
        <Pressable
          onPress={() => setSelectedId(null)}
          style={styles.backRow}
          hitSlop={8}
        >
          <Text style={styles.backText}>← Все привычки</Text>
        </Pressable>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.cubeDone]} />
            <Text style={styles.legendText}>ок</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.cubeMiss]} />
            <Text style={styles.legendText}>срыв</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.cubeFuture]} />
            <Text style={styles.legendText}>ещё нет</Text>
          </View>
          <Text style={styles.meta}>
            серия {streak} · срывов {missCount}
          </Text>
        </View>
        <Text style={styles.hint}>
          В каждом квадрате — число дня. Зелёный сам. Тап — отметить срыв.
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {months.map((m) => {
            const cells = monthGrid(m.year, m.month);
            return (
              <View key={`${m.year}-${m.month}`} style={styles.monthBlock}>
                <Text style={styles.monthLabel}>{m.label}</Text>
                <View style={[styles.weekRow, { gap: GAP }]}>
                  {WEEK.map((w) => (
                    <Text
                      key={w}
                      style={[styles.weekDay, { width: cell }]}
                    >
                      {w}
                    </Text>
                  ))}
                </View>
                <View style={[styles.grid, { gap: GAP }]}>
                  {cells.map((date, idx) => {
                    if (!date) {
                      return (
                        <View
                          key={`e-${idx}`}
                          style={{ width: cell, height: cell }}
                        />
                      );
                    }
                    const kind = habitDayKind(selected, date);
                    const isToday = date === today;
                    const dayNum = Number(date.slice(8, 10));
                    const filled =
                      kind === 'done' || kind === 'missed';
                    return (
                      <Pressable
                        key={date}
                        onPress={() => openDay(selected, date)}
                        style={[
                          styles.cube,
                          {
                            width: cell,
                            height: cell,
                            borderRadius: Math.max(4, Math.floor(cell / 8)),
                          },
                          kind === 'done' && styles.cubeDone,
                          kind === 'missed' && styles.cubeMiss,
                          kind === 'future' && styles.cubeFuture,
                          kind === 'empty' && styles.cubeEmpty,
                          isToday && styles.cubeToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cubeNum,
                            filled && styles.cubeNumFilled,
                            kind === 'future' && styles.cubeNumMuted,
                            kind === 'empty' && styles.cubeNumMuted,
                            { fontSize: Math.max(10, Math.min(14, cell * 0.38)) },
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <BottomSheet
          visible={Boolean(missDate)}
          onClose={() => setMissDate(null)}
          title="Нарушение"
        >
          <Text style={styles.hint}>Дата: {missDate}</Text>
          <Field
            placeholder="Почему не выполнил?"
            value={missReason}
            onChangeText={setMissReason}
            autoFocus
          />
          <PrimaryButton
            label="Отметить срыв"
            icon="x"
            onPress={saveMiss}
          />
        </BottomSheet>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Привычки"
        subtitle="Карточки и календарь"
        right={
          <IconButton name="plus" onPress={() => setShowForm(true)} />
        }
      />

      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Новая привычка"
      >
        <Field
          placeholder="Новая привычка"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={onAdd}
        />
        <View style={styles.chips}>
          {LIFE_AREAS.map((a) => (
            <Chip
              key={a.id}
              label={a.title}
              tone={a.color}
              selected={areaId === a.id}
              onPress={() => setAreaId(a.id)}
            />
          ))}
        </View>
        <Chip
          label={withRemind ? 'С напоминанием' : 'Без напоминания'}
          selected={withRemind}
          onPress={() => setWithRemind((v) => !v)}
        />
        {withRemind && (
          <DateTimeField
            label="Время"
            mode="time"
            value={remind}
            onChange={setRemind}
          />
        )}
        <PrimaryButton label="Сохранить" icon="check" onPress={onAdd} />
      </BottomSheet>

      <FlatList
        data={data.habits}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyHint>Начни с одной маленькой привычки.</EmptyHint>
        }
        renderItem={({ item }) => {
          const area = LIFE_AREAS.find((a) => a.id === item.areaId);
          const okToday = habitDayKind(item, today) === 'done';
          const missedToday = habitDayKind(item, today) === 'missed';
          const streak = countHabitStreak(item);
          return (
            <Pressable
              style={styles.card}
              onPress={() => setSelectedId(item.id)}
              onLongPress={() =>
                Alert.alert('Удалить?', item.title, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => void removeHabit(item.id),
                  },
                ])
              }
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {area?.title} · серия {streak}
                    {item.remindAt ? ` · ${item.remindAt}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    okToday && styles.cubeDone,
                    missedToday && styles.cubeMiss,
                  ]}
                />
              </View>
              <MiniWeek habit={item} />
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

function MiniWeek({ habit }: { habit: Habit }) {
  const days: { date: string; label: string }[] = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    days.push({
      date: `${y}-${m}-${day}`,
      label: WEEK[x.getDay() === 0 ? 6 : x.getDay() - 1],
    });
  }
  return (
    <View style={styles.miniRow}>
      {days.map(({ date, label }) => {
        const kind = habitDayKind(habit, date);
        const filled = kind === 'done' || kind === 'missed';
        return (
          <View key={date} style={styles.miniCol}>
            <Text style={styles.miniLabel}>{label}</Text>
            <View
              style={[
                styles.miniCube,
                kind === 'done' && styles.cubeDone,
                kind === 'missed' && styles.cubeMiss,
                kind === 'future' && styles.cubeFuture,
                kind === 'empty' && styles.cubeEmpty,
              ]}
            >
              <Text
                style={[
                  styles.miniNum,
                  filled && styles.cubeNumFilled,
                ]}
              >
                {Number(date.slice(8, 10))}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  backRow: { marginBottom: space.md },
  backText: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.accent,
  },
  hint: {
    marginBottom: space.md,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: space.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
  },
  meta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  miniCol: { alignItems: 'center', flex: 1 },
  miniLabel: {
    fontSize: 10,
    fontFamily: fonts.sans,
    color: colors.faint,
    marginBottom: 4,
  },
  miniCube: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 36,
    borderRadius: 6,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniNum: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    color: colors.ink,
  },
  monthBlock: { marginBottom: space.xl },
  monthLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
    textTransform: 'capitalize',
    marginBottom: space.sm,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDay: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: fonts.sansMedium,
    color: colors.faint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cube: {
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cubeNum: {
    fontFamily: fonts.sansSemi,
    color: colors.ink,
  },
  cubeNumFilled: {
    color: '#fff',
  },
  cubeNumMuted: {
    color: colors.faint,
  },
  cubeDone: {
    backgroundColor: '#2F6B4F',
  },
  cubeMiss: {
    backgroundColor: '#C23B3B',
  },
  cubeFuture: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  cubeEmpty: {
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  cubeToday: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
