import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import {
  Chip,
  EmptyHint,
  Field,
  Header,
  IconButton,
  PrimaryButton,
  Screen,
  SectionLabel,
} from '../components/ui';
import { useData } from '../context/DataContext';
import {
  bestSet,
  formatSet,
  lastLog,
  logsForExercise,
  personalBest,
} from '../lib/gym';
import { todayIso } from '../lib/storage';
import { colors, fonts, radii, space } from '../theme';
import {
  GYM_MUSCLES,
  type GymMuscleId,
  type GymSet,
} from '../types';

type Mode = 'list' | 'detail';

export function GymScreen() {
  const {
    data,
    addGymExercise,
    removeGymExercise,
    addGymLog,
    removeGymLog,
    seedDefaultGymExercises,
  } = useData();

  const [mode, setMode] = useState<Mode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [title, setTitle] = useState('');
  const [muscle, setMuscle] = useState<GymMuscleId>('other');
  const [sets, setSets] = useState<{ reps: string; weight: string }[]>([
    { reps: '8', weight: '20' },
    { reps: '8', weight: '20' },
    { reps: '8', weight: '20' },
  ]);
  const [filter, setFilter] = useState<GymMuscleId | 'all'>('all');

  useEffect(() => {
    if ((data.gymExercises ?? []).length === 0) {
      seedDefaultGymExercises();
    }
  }, [data.gymExercises, seedDefaultGymExercises]);

  const exercises = useMemo(() => {
    let list = [...(data.gymExercises ?? [])];
    if (filter !== 'all') list = list.filter((e) => e.muscle === filter);
    return list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [data.gymExercises, filter]);

  const selected = (data.gymExercises ?? []).find((e) => e.id === selectedId);
  const history = selectedId
    ? logsForExercise(data.gymLogs ?? [], selectedId)
    : [];

  const openDetail = (id: string) => {
    setSelectedId(id);
    setMode('detail');
  };

  const backToList = () => {
    setSelectedId(null);
    setMode('list');
    setShowLogForm(false);
  };

  const onAddExercise = () => {
    if (!title.trim()) return;
    addGymExercise({ title, muscle });
    setTitle('');
    setMuscle('other');
    setShowExerciseForm(false);
  };

  const onAddLog = () => {
    if (!selectedId) return;
    const parsed: GymSet[] = sets
      .map((s) => ({
        reps: Number(String(s.reps).replace(',', '.')),
        weight: Number(String(s.weight).replace(',', '.')),
      }))
      .filter((s) => Number.isFinite(s.reps) && s.reps > 0);
    if (!parsed.length) {
      Alert.alert('Подходы', 'Укажи хотя бы один подход с повторениями');
      return;
    }
    addGymLog({
      exerciseId: selectedId,
      date: todayIso(),
      sets: parsed,
    });
    setShowLogForm(false);
  };

  const updateSet = (
    index: number,
    key: 'reps' | 'weight',
    value: string,
  ) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );
  };

  if (mode === 'detail' && selected) {
    const muscleLabel =
      GYM_MUSCLES.find((m) => m.id === selected.muscle)?.title ?? '';
    const pb = personalBest(data.gymLogs ?? [], selected.id);
    const last = lastLog(data.gymLogs ?? [], selected.id);

    return (
      <Screen>
        <Header
          title={selected.title}
          subtitle={muscleLabel}
          showMenu={false}
          right={
            <IconButton
              name="plus"
              onPress={() => {
                if (last?.sets?.length) {
                  setSets(
                    last.sets.map((s) => ({
                      reps: String(s.reps),
                      weight: String(s.weight),
                    })),
                  );
                }
                setShowLogForm(true);
              }}
            />
          }
        />
        <Pressable onPress={backToList} style={styles.backRow} hitSlop={8}>
          <Text style={styles.backText}>← Упражнения</Text>
        </Pressable>

        <View style={styles.stats}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Последний</Text>
            <Text style={styles.statValue}>
              {last?.sets?.length
                ? formatSet(bestSet(last.sets)!)
                : '—'}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Рекорд</Text>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {pb ? formatSet(pb) : '—'}
            </Text>
          </View>
        </View>

        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyHint>Запиши первую тренировку по этому упражнению.</EmptyHint>
          }
          ListHeaderComponent={<SectionLabel>История</SectionLabel>}
          renderItem={({ item }) => {
            const top = bestSet(item.sets);
            return (
              <Pressable
                style={styles.logCard}
                onLongPress={() =>
                  Alert.alert('Удалить запись?', item.date, [
                    { text: 'Отмена', style: 'cancel' },
                    {
                      text: 'Удалить',
                      style: 'destructive',
                      onPress: () => removeGymLog(item.id),
                    },
                  ])
                }
              >
                <View style={styles.logTop}>
                  <Text style={styles.logDate}>{item.date}</Text>
                  <Text style={styles.logBest}>
                    {top ? formatSet(top) : ''}
                  </Text>
                </View>
                <Text style={styles.logSets}>
                  {item.sets.map((s, i) => `${i + 1}) ${formatSet(s)}`).join(' · ')}
                </Text>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />

        <BottomSheet
          visible={showLogForm}
          onClose={() => setShowLogForm(false)}
          title="Запись в зале"
        >
          <SectionLabel>Подходы (кг × повторы)</SectionLabel>
          {sets.map((s, i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.setIndex}>{i + 1}</Text>
              <Field
                style={styles.setField}
                placeholder="кг"
                value={s.weight}
                onChangeText={(v) => updateSet(i, 'weight', v)}
                keyboardType="decimal-pad"
              />
              <Text style={styles.setX}>×</Text>
              <Field
                style={styles.setField}
                placeholder="повт"
                value={s.reps}
                onChangeText={(v) => updateSet(i, 'reps', v)}
                keyboardType="number-pad"
              />
            </View>
          ))}
          <View style={styles.setActions}>
            <PrimaryButton
              label="Ещё подход"
              variant="soft"
              onPress={() =>
                setSets((prev) => [
                  ...prev,
                  prev[prev.length - 1] ?? { reps: '8', weight: '20' },
                ])
              }
            />
            {sets.length > 1 ? (
              <PrimaryButton
                label="Убрать"
                variant="ghost"
                onPress={() => setSets((prev) => prev.slice(0, -1))}
              />
            ) : null}
          </View>
          <PrimaryButton label="Сохранить" icon="check" onPress={onAddLog} />
        </BottomSheet>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Зал"
        subtitle="Прогресс по упражнениям"
        right={
          <IconButton name="plus" onPress={() => setShowExerciseForm(true)} />
        }
      />

      <View style={styles.filters}>
        <Chip
          label="Все"
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        {GYM_MUSCLES.map((m) => (
          <Chip
            key={m.id}
            label={m.title}
            selected={filter === m.id}
            onPress={() => setFilter(m.id)}
          />
        ))}
      </View>

      <BottomSheet
        visible={showExerciseForm}
        onClose={() => setShowExerciseForm(false)}
        title="Новое упражнение"
      >
        <Field
          placeholder="Название"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={onAddExercise}
        />
        <SectionLabel>Группа мышц</SectionLabel>
        <View style={styles.filters}>
          {GYM_MUSCLES.map((m) => (
            <Chip
              key={m.id}
              label={m.title}
              selected={muscle === m.id}
              onPress={() => setMuscle(m.id)}
            />
          ))}
        </View>
        <PrimaryButton label="Добавить" icon="check" onPress={onAddExercise} />
      </BottomSheet>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyHint>Добавь упражнения или дождись стартового набора.</EmptyHint>
        }
        renderItem={({ item }) => {
          const last = lastLog(data.gymLogs ?? [], item.id);
          const pb = personalBest(data.gymLogs ?? [], item.id);
          const muscleLabel =
            GYM_MUSCLES.find((m) => m.id === item.muscle)?.title ?? '';
          return (
            <Pressable
              style={styles.card}
              onPress={() => openDetail(item.id)}
              onLongPress={() =>
                Alert.alert('Удалить упражнение?', item.title, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => removeGymExercise(item.id),
                  },
                ])
              }
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.meta}>{muscleLabel}</Text>
                </View>
                <Text style={styles.cardBest}>
                  {pb ? formatSet(pb) : '—'}
                </Text>
              </View>
              <Text style={styles.meta}>
                {last && last.sets.length
                  ? `Последний ${last.date} · ${last.sets.length} подх. · ${formatSet(bestSet(last.sets)!)}`
                  : 'Ещё не записывал'}
              </Text>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap' },
  backRow: { marginBottom: space.md },
  backText: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.accent,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: space.md,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  statValue: {
    marginTop: 4,
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.ink,
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
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
  },
  cardBest: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.accent,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.sm,
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logDate: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.ink,
  },
  logBest: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.accent,
  },
  logSets: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  setIndex: {
    width: 20,
    fontFamily: fonts.sansSemi,
    color: colors.muted,
  },
  setField: { flex: 1 },
  setX: {
    fontFamily: fonts.sansBold,
    color: colors.faint,
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: space.md,
  },
});
