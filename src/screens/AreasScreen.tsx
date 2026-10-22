import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyHint, Header, Screen } from '../components/ui';
import { useData } from '../context/DataContext';
import { colors, fonts, radii, space } from '../theme';
import { LIFE_AREAS } from '../types';

export function AreasScreen() {
  const { data } = useData();

  const stats = useMemo(
    () =>
      LIFE_AREAS.map((area) => {
        const goals = data.goals.filter((g) => g.areaId === area.id);
        const habits = data.habits.filter((h) => h.areaId === area.id);
        const tasks = data.tasks.filter(
          (t) => t.areaId === area.id && !t.done,
        );
        return {
          area,
          goalsOpen: goals.filter((g) => !g.done).length,
          goalsDone: goals.filter((g) => g.done).length,
          habits: habits.length,
          tasksOpen: tasks.length,
          total:
            goals.filter((g) => !g.done).length +
            habits.length +
            tasks.length,
        };
      }),
    [data],
  );

  const max = Math.max(1, ...stats.map((s) => s.total));

  return (
    <Screen>
      <Header title="Сферы" subtitle="Куда уходит внимание" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {stats.every((s) => s.total === 0) ? (
          <EmptyHint>Пока пусто — добавь цели или задачи.</EmptyHint>
        ) : null}
        {stats.map(({ area, goalsOpen, habits, tasksOpen, goalsDone, total }) => (
          <View key={area.id} style={styles.card}>
            <View style={styles.top}>
              <View
                style={[styles.swatch, { backgroundColor: area.color }]}
              />
              <Text style={styles.title}>{area.title}</Text>
            </View>
            <Text style={styles.meta}>
              {goalsOpen} целей · {habits} привычек · {tasksOpen} задач
              {goalsDone > 0 ? ` · закрыто ${goalsDone}` : ''}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: area.color,
                    width: `${(total / max) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  title: {
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.ink,
  },
  meta: {
    marginTop: 6,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  track: {
    marginTop: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
});
