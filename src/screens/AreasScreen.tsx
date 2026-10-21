import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, Subtitle, Title } from '../components/ui';
import { useData } from '../context/DataContext';
import { colors } from '../theme';
import { LIFE_AREAS } from '../types';

export function AreasScreen() {
  const { data } = useData();

  const stats = useMemo(
    () =>
      LIFE_AREAS.map((area) => {
        const goals = data.goals.filter((g) => g.areaId === area.id);
        const habits = data.habits.filter((h) => h.areaId === area.id);
        const tasks = data.tasks.filter((t) => t.areaId === area.id && !t.done);
        return {
          area,
          goalsOpen: goals.filter((g) => !g.done).length,
          goalsDone: goals.filter((g) => g.done).length,
          habits: habits.length,
          tasksOpen: tasks.length,
        };
      }),
    [data],
  );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Title>Сферы</Title>
        <Subtitle>Баланс жизни — где сейчас больше внимания</Subtitle>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {stats.map(({ area, goalsOpen, goalsDone, habits, tasksOpen }) => {
          const total = goalsOpen + habits + tasksOpen;
          return (
            <View
              key={area.id}
              style={[styles.card, { borderLeftColor: area.color }]}
            >
              <Text style={styles.cardTitle}>{area.title}</Text>
              <Text style={styles.cardMeta}>
                {goalsOpen} целей · {habits} привычек · {tasksOpen} задач
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: area.color,
                      width: `${Math.min(100, total * 12)}%`,
                    },
                  ]}
                />
              </View>
              {goalsDone > 0 && (
                <Text style={styles.doneHint}>Закрыто целей: {goalsDone}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },
  barTrack: {
    marginTop: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  doneHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
});
