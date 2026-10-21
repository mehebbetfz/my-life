import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import {
  Chip,
  EmptyHint,
  Field,
  PrimaryButton,
  Row,
  Screen,
  Subtitle,
  Title,
} from '../components/ui';
import { useData } from '../context/DataContext';
import { todayIso } from '../lib/storage';
import { colors } from '../theme';
import { LIFE_AREAS, type LifeAreaId } from '../types';

export function HabitsScreen() {
  const { data, addHabit, toggleHabitToday, removeHabit } = useData();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<LifeAreaId>('health');
  const today = todayIso();

  const onAdd = () => {
    if (!title.trim()) return;
    addHabit(title, areaId);
    setTitle('');
  };

  return (
    <Screen>
      <Title>Привычки</Title>
      <Subtitle>Отмечай выполнение — стрик считается по дням</Subtitle>

      <View style={styles.addRow}>
        <Field
          style={styles.addField}
          placeholder="Новая привычка"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        <PrimaryButton label="+" onPress={onAdd} />
      </View>

      <View style={styles.chips}>
        {LIFE_AREAS.map((a) => (
          <Chip
            key={a.id}
            label={a.title}
            color={a.color}
            selected={areaId === a.id}
            onPress={() => setAreaId(a.id)}
          />
        ))}
      </View>

      <FlatList
        data={data.habits}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyHint>
            Начни с одной маленькой привычки — легче удержать ритм.
          </EmptyHint>
        }
        renderItem={({ item }) => {
          const area = LIFE_AREAS.find((a) => a.id === item.areaId);
          const doneToday = item.completions.includes(today);
          const streak = countStreak(item.completions);
          return (
            <Row
              onPress={() => toggleHabitToday(item.id)}
              onLongPress={() =>
                Alert.alert('Удалить привычку?', item.title, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => removeHabit(item.id),
                  },
                ])
              }
            >
              <View style={styles.rowInner}>
                <View
                  style={[
                    styles.check,
                    doneToday && { backgroundColor: colors.success },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {area?.title} · серия {streak} дн. · всего{' '}
                    {item.completions.length}
                  </Text>
                </View>
              </View>
            </Row>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

function countStreak(completions: string[]): number {
  const set = new Set(completions);
  let streak = 0;
  const d = new Date();
  for (;;) {
    const iso = d.toISOString().slice(0, 10);
    if (!set.has(iso)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  addField: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
  },
  itemTitle: { fontSize: 16, color: colors.ink, fontWeight: '500' },
  meta: { fontSize: 12, marginTop: 2, color: colors.muted },
});
