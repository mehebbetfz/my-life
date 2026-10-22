import React, { useMemo, useState } from 'react';
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
import { goalProgress } from '../lib/goals';
import { colors, fonts, radii, space } from '../theme';
import { LIFE_AREAS, type Goal, type LifeAreaId } from '../types';

const PROGRESS_STEPS = [0, 25, 50, 75, 100];

export function GoalsScreen() {
  const {
    data,
    addGoal,
    removeGoal,
    addGoalStage,
    updateGoalStage,
    removeGoalStage,
  } = useData();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<LifeAreaId>('growth');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageTitle, setStageTitle] = useState('');
  const [showStageForm, setShowStageForm] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const selected = useMemo(
    () => data.goals.find((g) => g.id === selectedId) ?? null,
    [data.goals, selectedId],
  );

  const onAddGoal = () => {
    if (!title.trim()) return;
    addGoal(title, areaId);
    setTitle('');
    setShowForm(false);
  };

  const onAddStage = () => {
    if (!selectedId || !stageTitle.trim()) return;
    addGoalStage(selectedId, stageTitle);
    setStageTitle('');
    setShowStageForm(false);
  };

  if (selected) {
    const area = LIFE_AREAS.find((a) => a.id === selected.areaId);
    const pct = goalProgress(selected);
    return (
      <Screen>
        <Header
          title={selected.title}
          subtitle={area?.title ?? 'Этапы'}
          showMenu={false}
          right={
            <IconButton
              name="plus"
              onPress={() => {
                setStageTitle('');
                setShowStageForm(true);
              }}
            />
          }
        />
        <Pressable
          onPress={() => setSelectedId(null)}
          style={styles.backRow}
          hitSlop={8}
        >
          <Text style={styles.backText}>← Все цели</Text>
        </Pressable>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryPct}>{pct}%</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${pct}%`,
                  backgroundColor: area?.color ?? colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.summaryMeta}>
            {(selected.stages ?? []).length} этапов
            {selected.done ? ' · завершено' : ''}
          </Text>
        </View>

        <FlatList
          data={selected.stages ?? []}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyHint>Добавь этапы — прогресс цели посчитается по ним.</EmptyHint>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.stageCard}
              onPress={() => setEditingStageId(item.id)}
              onLongPress={() =>
                Alert.alert('Удалить этап?', item.title, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => removeGoalStage(selected.id, item.id),
                  },
                ])
              }
            >
              <View style={styles.stageTop}>
                <Text style={styles.stageTitle}>{item.title}</Text>
                <Text style={styles.stagePct}>{item.progress}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${item.progress}%`,
                      backgroundColor: area?.color ?? colors.accent,
                    },
                  ]}
                />
              </View>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />

        <BottomSheet
          visible={showStageForm}
          onClose={() => setShowStageForm(false)}
          title="Новый этап"
        >
          <Field
            placeholder="Название этапа"
            value={stageTitle}
            onChangeText={setStageTitle}
            onSubmitEditing={onAddStage}
          />
          <PrimaryButton label="Добавить" icon="check" onPress={onAddStage} />
        </BottomSheet>

        <StageProgressSheet
          goal={selected}
          stageId={editingStageId}
          onClose={() => setEditingStageId(null)}
          onChange={(progress) => {
            if (!editingStageId) return;
            updateGoalStage(selected.id, editingStageId, { progress });
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Цели"
        subtitle="Карточки с прогрессом"
        right={
          <IconButton name="plus" onPress={() => setShowForm(true)} />
        }
      />

      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Новая цель"
      >
        <Field
          placeholder="Новая цель"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={onAddGoal}
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
        <PrimaryButton label="Сохранить" icon="check" onPress={onAddGoal} />
      </BottomSheet>

      <FlatList
        data={data.goals}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyHint>Создай цель — потом добавь этапы внутри.</EmptyHint>
        }
        renderItem={({ item }) => {
          const area = LIFE_AREAS.find((a) => a.id === item.areaId);
          const pct = goalProgress(item);
          return (
            <Pressable
              style={styles.goalCard}
              onPress={() => setSelectedId(item.id)}
              onLongPress={() =>
                Alert.alert('Удалить?', item.title, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => removeGoal(item.id),
                  },
                ])
              }
            >
              <View style={styles.goalTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>{item.title}</Text>
                  <Text style={[styles.meta, { color: area?.color }]}>
                    {area?.title}
                    {(item.stages ?? []).length
                      ? ` · ${(item.stages ?? []).length} этапов`
                      : ' · без этапов'}
                  </Text>
                </View>
                <Text style={styles.goalPct}>{pct}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${pct}%`,
                      backgroundColor: area?.color ?? colors.accent,
                    },
                  ]}
                />
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

function StageProgressSheet({
  goal,
  stageId,
  onClose,
  onChange,
}: {
  goal: Goal;
  stageId: string | null;
  onClose: () => void;
  onChange: (progress: number) => void;
}) {
  const stage = (goal.stages ?? []).find((s) => s.id === stageId);
  return (
    <BottomSheet
      visible={Boolean(stage)}
      onClose={onClose}
      title={stage?.title ?? 'Этап'}
    >
      <SectionLabel>Прогресс</SectionLabel>
      <View style={styles.chips}>
        {PROGRESS_STEPS.map((p) => (
          <Chip
            key={p}
            label={`${p}%`}
            selected={stage?.progress === p}
            onPress={() => onChange(p)}
          />
        ))}
      </View>
      <PrimaryButton label="Готово" icon="check" onPress={onClose} />
    </BottomSheet>
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.md,
  },
  summaryPct: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  summaryMeta: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.sm,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  goalTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
  },
  goalPct: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: colors.ink,
  },
  meta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  stageCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.sm,
  },
  stageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  stageTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  stagePct: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.accent,
  },
});
