import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { DateTimeField } from '../components/DateTimeField';
import {
  PriorityFlag,
  PriorityPicker,
  priorityMeta,
} from '../components/PriorityPicker';
import {
  Check,
  Chip,
  EmptyHint,
  Field,
  Header,
  IconButton,
  PrimaryButton,
  Row,
  Screen,
  SectionLabel,
} from '../components/ui';
import { useData } from '../context/DataContext';
import { todayIso } from '../lib/storage';
import { colors, fonts } from '../theme';
import { LIFE_AREAS, type LifeAreaId, type Priority } from '../types';

type Filter = 'open' | 'today' | 'done' | 'all';

export function TodosScreen() {
  const { data, addTask, toggleTask, removeTask } = useData();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [areaId, setAreaId] = useState<LifeAreaId | undefined>();
  const [priority, setPriority] = useState<Priority>('medium');
  const [due, setDue] = useState(new Date());
  const [withTime, setWithTime] = useState(false);
  const [withRemind, setWithRemind] = useState(false);
  const [remind, setRemind] = useState(new Date(Date.now() + 3600_000));
  const [filter, setFilter] = useState<Filter>('open');
  const [showForm, setShowForm] = useState(false);
  const today = todayIso();

  const list = useMemo(() => {
    let items = [...data.tasks];
    if (filter === 'open') items = items.filter((t) => !t.done);
    if (filter === 'done') items = items.filter((t) => t.done);
    if (filter === 'today') {
      items = items.filter((t) => t.dueDate === today && !t.done);
    }
    const rank = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const da = a.dueDate ?? '9999';
      const db = b.dueDate ?? '9999';
      if (da !== db) return da.localeCompare(db);
      return rank[a.priority] - rank[b.priority];
    });
  }, [data.tasks, filter, today]);

  const onAdd = async () => {
    if (!title.trim()) return;
    const y = due.getFullYear();
    const m = String(due.getMonth() + 1).padStart(2, '0');
    const d = String(due.getDate()).padStart(2, '0');
    const localDate = `${y}-${m}-${d}`;
    const dueTime = withTime
      ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`
      : undefined;
    await addTask({
      title,
      notes: notes || undefined,
      areaId,
      priority,
      dueDate: localDate,
      dueTime,
      remindAt: withRemind ? remind.toISOString() : undefined,
    });
    setTitle('');
    setNotes('');
    setShowForm(false);
    setWithTime(false);
    setWithRemind(false);
  };

  return (
    <Screen>
      <Header
        title="Задачи"
        subtitle="Приоритеты и напоминания"
        right={
          <IconButton
            name="plus"
            accessibilityLabel="Новая задача"
            onPress={() => setShowForm(true)}
          />
        }
      />

      <View style={styles.filters}>
        {(
          [
            ['open', 'Активные'],
            ['today', 'Сегодня'],
            ['done', 'Готово'],
            ['all', 'Все'],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={filter === id}
            onPress={() => setFilter(id)}
          />
        ))}
      </View>

      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Новая задача"
      >
        <Field
          placeholder="Что сделать"
          value={title}
          onChangeText={setTitle}
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder="Заметка"
          value={notes}
          onChangeText={setNotes}
        />
        <PriorityPicker value={priority} onChange={setPriority} />
        <SectionLabel>Сфера</SectionLabel>
        <View style={styles.filters}>
          {LIFE_AREAS.map((a) => (
            <Chip
              key={a.id}
              label={a.title}
              tone={a.color}
              selected={areaId === a.id}
              onPress={() =>
                setAreaId(areaId === a.id ? undefined : a.id)
              }
            />
          ))}
        </View>
        <DateTimeField label="Срок" mode="date" value={due} onChange={setDue} />
        <View style={styles.filters}>
          <Chip
            label="Время"
            selected={withTime}
            onPress={() => setWithTime((v) => !v)}
          />
          <Chip
            label="Напоминание"
            selected={withRemind}
            onPress={() => setWithRemind((v) => !v)}
          />
        </View>
        {withTime && (
          <DateTimeField label="Время" mode="time" value={due} onChange={setDue} />
        )}
        {withRemind && (
          <DateTimeField
            label="Напомнить"
            mode="time"
            value={remind}
            onChange={(t) => {
              const next = new Date(due);
              next.setHours(t.getHours(), t.getMinutes(), 0, 0);
              setRemind(next);
            }}
          />
        )}
        <PrimaryButton label="Сохранить" icon="check" onPress={() => void onAdd()} />
      </BottomSheet>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyHint>Нет задач в этом фильтре.</EmptyHint>
        }
        renderItem={({ item }) => {
          const area = LIFE_AREAS.find((a) => a.id === item.areaId);
          const pr = priorityMeta(item.priority);
          return (
            <Row
              onPress={() => void toggleTask(item.id)}
              onLongPress={() =>
                Alert.alert('Удалить?', item.title, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => void removeTask(item.id),
                  },
                ])
              }
            >
              <View style={styles.line}>
                <Check done={item.done} />
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <PriorityFlag priority={item.priority} />
                    <Text
                      style={[
                        styles.itemTitle,
                        item.done && styles.done,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {pr.title}
                    {area ? ` · ${area.title}` : ''}
                    {item.dueDate
                      ? ` · ${item.dueDate}${item.dueTime ? ` ${item.dueTime}` : ''}`
                      : ''}
                  </Text>
                </View>
              </View>
            </Row>
          );
        }}
        contentContainerStyle={{ paddingBottom: 48 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap' },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
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
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
});
