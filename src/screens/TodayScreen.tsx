import React, { useMemo, useState } from 'react';
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

export function TodayScreen() {
  const { data, addTask, toggleTask, removeTask, toggleHabitToday } = useData();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<LifeAreaId | undefined>();

  const today = todayIso();
  const tasks = useMemo(
    () =>
      data.tasks.filter(
        (t) => !t.dueDate || t.dueDate === today || !t.done,
      ),
    [data.tasks, today],
  );

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  const onAdd = () => {
    if (!title.trim()) return;
    addTask(title, areaId);
    setTitle('');
  };

  const confirmRemove = (id: string, label: string) => {
    Alert.alert('Удалить?', label, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeTask(id) },
    ]);
  };

  return (
    <Screen>
      <Title>Сегодня</Title>
      <Subtitle>
        {new Date().toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </Subtitle>

      <View style={styles.addRow}>
        <Field
          style={styles.addField}
          placeholder="Новая задача на сегодня"
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
            onPress={() => setAreaId(areaId === a.id ? undefined : a.id)}
          />
        ))}
      </View>

      {data.habits.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Привычки</Text>
          {data.habits.map((h) => {
            const done = h.completions.includes(today);
            const area = LIFE_AREAS.find((a) => a.id === h.areaId);
            return (
              <Row key={h.id} onPress={() => toggleHabitToday(h.id)}>
                <View style={styles.habitRow}>
                  <View
                    style={[
                      styles.check,
                      done && { backgroundColor: colors.success },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{h.title}</Text>
                    {area && (
                      <Text style={[styles.meta, { color: area.color }]}>
                        {area.title}
                      </Text>
                    )}
                  </View>
                </View>
              </Row>
            );
          })}
        </View>
      )}

      <Text style={styles.blockTitle}>Задачи</Text>
      <FlatList
        data={[...openTasks, ...doneTasks]}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyHint>Добавь первую задачу — планирование начнётся здесь.</EmptyHint>
        }
        renderItem={({ item }) => {
          const area = LIFE_AREAS.find((a) => a.id === item.areaId);
          return (
            <Row
              onPress={() => toggleTask(item.id)}
              onLongPress={() => confirmRemove(item.id, item.title)}
            >
              <View style={styles.habitRow}>
                <View
                  style={[
                    styles.check,
                    item.done && { backgroundColor: colors.success },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.itemTitle,
                      item.done && styles.itemDone,
                    ]}
                  >
                    {item.title}
                  </Text>
                  {area && (
                    <Text style={[styles.meta, { color: area.color }]}>
                      {area.title}
                    </Text>
                  )}
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

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  addField: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  block: { marginBottom: 8 },
  blockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
  },
  itemTitle: { fontSize: 16, color: colors.ink, fontWeight: '500' },
  itemDone: { textDecorationLine: 'line-through', color: colors.muted },
  meta: { fontSize: 12, marginTop: 2, fontWeight: '600' },
});
