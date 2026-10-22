import React, { useMemo, useState } from 'react';
import {
  Alert,
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
  IconButton,
  PrimaryButton,
  Screen,
  SectionLabel,
} from '../components/ui';
import { useData } from '../context/DataContext';
import { todayIso } from '../lib/storage';
import { colors, fonts, radii, space } from '../theme';
import {
  LIFE_AREAS,
  type CalendarEvent,
  type LifeAreaId,
} from '../types';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const REMIND_OPTIONS = [
  { label: 'Нет', value: undefined as number | undefined },
  { label: 'В момент', value: 0 },
  { label: '15 мин', value: 15 },
  { label: '1 час', value: 60 },
  { label: '1 день', value: 1440 },
];

type ViewMode = 'month' | 'agenda';

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function eventColor(e: CalendarEvent): string {
  return LIFE_AREAS.find((a) => a.id === e.areaId)?.color ?? colors.accent;
}

function formatEventTime(e: CalendarEvent): string {
  if (e.allDay) return 'Весь день';
  if (e.startTime && e.endTime) return `${e.startTime}–${e.endTime}`;
  return e.startTime ?? '';
}

function addDaysIso(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

export function CalendarScreen() {
  const { width } = useWindowDimensions();
  const { data, addEvent, removeEvent } = useData();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayIso());
  const [view, setView] = useState<ViewMode>('month');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    return d;
  });
  const [areaId, setAreaId] = useState<LifeAreaId | undefined>();
  const [remindMinutesBefore, setRemindMinutesBefore] = useState<
    number | undefined
  >(15);
  const [notes, setNotes] = useState('');

  const today = todayIso();
  const cellW = (width - space.sm * 2) / 7;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of data.events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return (a.startTime ?? '').localeCompare(b.startTime ?? '');
      });
    }
    return map;
  }, [data.events]);

  const dayEvents = eventsByDate.get(selected) ?? [];

  const dayTasks = useMemo(
    () => data.tasks.filter((t) => t.dueDate === selected && !t.done),
    [data.tasks, selected],
  );

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const total = daysInMonth(cursor);
    const pad = mondayIndex(first);
    const list: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < pad; i++) list.push({ iso: null, day: null });
    for (let day = 1; day <= total; day++) {
      const iso = toIso(
        new Date(cursor.getFullYear(), cursor.getMonth(), day),
      );
      list.push({ iso, day });
    }
    while (list.length % 7 !== 0) list.push({ iso: null, day: null });
    return list;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const agendaDays = useMemo(() => {
    const startIso = toIso(startOfMonth(cursor));
    const endDay = daysInMonth(cursor);
    const endIso = toIso(
      new Date(cursor.getFullYear(), cursor.getMonth(), endDay),
    );
    const days: string[] = [];
    let cur = startIso;
    while (cur <= endIso) {
      const evs = eventsByDate.get(cur) ?? [];
      const tasks = data.tasks.filter((t) => t.dueDate === cur && !t.done);
      if (evs.length > 0 || tasks.length > 0 || cur === today) {
        days.push(cur);
      }
      cur = addDaysIso(cur, 1);
    }
    return days;
  }, [cursor, eventsByDate, data.tasks, today]);

  const goToday = () => {
    const now = new Date();
    setCursor(startOfMonth(now));
    setSelected(todayIso());
  };

  const openCreate = (iso?: string) => {
    if (iso) setSelected(iso);
    setShowForm(true);
  };

  const onAdd = async () => {
    if (!title.trim()) return;
    await addEvent({
      title,
      date: selected,
      allDay,
      startTime: allDay
        ? undefined
        : `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      endTime: allDay
        ? undefined
        : `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      areaId,
      notes: notes || undefined,
      remindMinutesBefore,
    });
    setTitle('');
    setNotes('');
    setShowForm(false);
    setAllDay(true);
  };

  const confirmRemove = (item: CalendarEvent) => {
    Alert.alert('Удалить событие?', item.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => void removeEvent(item.id),
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Pressable onPress={goToday} style={styles.todayBtn} hitSlop={8}>
            <Text style={styles.todayBtnText}>Сегодня</Text>
          </Pressable>
          <View style={styles.monthNav}>
            <IconButton
              name="chevron-left"
              onPress={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
            />
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <IconButton
              name="chevron-right"
              onPress={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
            />
          </View>
        </View>
        <IconButton name="plus" onPress={() => openCreate()} />
      </View>

      <View style={styles.viewTabs}>
        <Pressable
          onPress={() => setView('month')}
          style={[styles.viewTab, view === 'month' && styles.viewTabOn]}
        >
          <Text
            style={[
              styles.viewTabText,
              view === 'month' && styles.viewTabTextOn,
            ]}
          >
            Месяц
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('agenda')}
          style={[styles.viewTab, view === 'agenda' && styles.viewTabOn]}
        >
          <Text
            style={[
              styles.viewTabText,
              view === 'agenda' && styles.viewTabTextOn,
            ]}
          >
            Расписание
          </Text>
        </Pressable>
      </View>

      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Новое событие"
        footer={
          <PrimaryButton
            label="Сохранить"
            icon="check"
            onPress={() => void onAdd()}
          />
        }
      >
        <Field
          placeholder="Название"
          value={title}
          onChangeText={setTitle}
        />
        <Text style={styles.formDate}>
          {parseIso(selected).toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        <View style={styles.chips}>
          <Chip
            label={allDay ? 'Весь день' : 'Со временем'}
            selected
            onPress={() => setAllDay((v) => !v)}
          />
        </View>
        {!allDay && (
          <>
            <DateTimeField
              label="Начало"
              mode="time"
              value={start}
              onChange={setStart}
            />
            <DateTimeField
              label="Конец"
              mode="time"
              value={end}
              onChange={setEnd}
            />
          </>
        )}
        <SectionLabel>Напоминание</SectionLabel>
        <View style={styles.chips}>
          {REMIND_OPTIONS.map((o) => (
            <Chip
              key={String(o.value)}
              label={o.label}
              selected={remindMinutesBefore === o.value}
              onPress={() => setRemindMinutesBefore(o.value)}
            />
          ))}
        </View>
        <SectionLabel>Цвет / сфера</SectionLabel>
        <View style={styles.chips}>
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
        <Field
          placeholder="Заметка"
          value={notes}
          onChangeText={setNotes}
        />
      </BottomSheet>

      {view === 'month' ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={[styles.weekday, { width: cellW }]}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (!cell.iso) {
                return (
                  <View
                    key={`e-${idx}`}
                    style={[styles.cell, { width: cellW }]}
                  />
                );
              }
              const isSelected = cell.iso === selected;
              const isToday = cell.iso === today;
              const dayEvs = eventsByDate.get(cell.iso) ?? [];
              const visible = dayEvs.slice(0, 2);
              const more = dayEvs.length - visible.length;

              return (
                <Pressable
                  key={cell.iso}
                  style={[styles.cell, { width: cellW }]}
                  onPress={() => setSelected(cell.iso!)}
                  onLongPress={() => openCreate(cell.iso!)}
                >
                  <View
                    style={[
                      styles.dayNumWrap,
                      isToday && styles.dayNumToday,
                      isSelected && !isToday && styles.dayNumSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        isToday && styles.dayNumTodayText,
                        isSelected && !isToday && styles.dayNumSelectedText,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                  <View style={styles.chipsCol}>
                    {visible.map((e) => (
                      <View
                        key={e.id}
                        style={[
                          styles.miniChip,
                          { backgroundColor: eventColor(e) },
                        ]}
                      >
                        <Text style={styles.miniChipText} numberOfLines={1}>
                          {e.title}
                        </Text>
                      </View>
                    ))}
                    {more > 0 ? (
                      <Text style={styles.moreText}>+{more}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.agendaPanel}>
            <View style={styles.agendaHead}>
              <Text style={styles.agendaTitle}>
                {parseIso(selected).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <Pressable onPress={() => openCreate(selected)} hitSlop={8}>
                <Text style={styles.agendaAdd}>+ Событие</Text>
              </Pressable>
            </View>

            {dayEvents.length === 0 && dayTasks.length === 0 ? (
              <EmptyHint>На этот день ничего нет.</EmptyHint>
            ) : null}

            {dayEvents.map((item) => (
              <Pressable
                key={item.id}
                style={styles.eventRow}
                onLongPress={() => confirmRemove(item)}
              >
                <View
                  style={[
                    styles.eventBar,
                    { backgroundColor: eventColor(item) },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventMeta}>
                    {formatEventTime(item)}
                    {item.notes ? ` · ${item.notes}` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}

            {dayTasks.map((t) => (
              <View key={t.id} style={styles.eventRow}>
                <View
                  style={[styles.eventBar, { backgroundColor: colors.muted }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{t.title}</Text>
                  <Text style={styles.eventMeta}>
                    задача{t.dueTime ? ` · ${t.dueTime}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: space.md }}
          showsVerticalScrollIndicator={false}
        >
          {agendaDays.length === 0 ? (
            <EmptyHint>В этом месяце событий нет.</EmptyHint>
          ) : (
            agendaDays.map((iso) => {
              const evs = eventsByDate.get(iso) ?? [];
              const tasks = data.tasks.filter(
                (t) => t.dueDate === iso && !t.done,
              );
              const isToday = iso === today;
              return (
                <View key={iso} style={styles.agendaBlock}>
                  <Pressable
                    onPress={() => {
                      setSelected(iso);
                      setView('month');
                    }}
                    style={styles.agendaDateCol}
                  >
                    <Text
                      style={[
                        styles.agendaWeekday,
                        isToday && { color: colors.accent },
                      ]}
                    >
                      {parseIso(iso)
                        .toLocaleDateString('ru-RU', { weekday: 'short' })
                        .toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.agendaDayBubble,
                        isToday && styles.dayNumToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.agendaDayNum,
                          isToday && styles.dayNumTodayText,
                        ]}
                      >
                        {parseIso(iso).getDate()}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.agendaItems}>
                    {evs.map((e) => (
                      <Pressable
                        key={e.id}
                        style={[
                          styles.agendaCard,
                          { borderLeftColor: eventColor(e) },
                        ]}
                        onLongPress={() => confirmRemove(e)}
                      >
                        <Text style={styles.eventTitle}>{e.title}</Text>
                        <Text style={styles.eventMeta}>
                          {formatEventTime(e)}
                        </Text>
                      </Pressable>
                    ))}
                    {tasks.map((t) => (
                      <View
                        key={t.id}
                        style={[
                          styles.agendaCard,
                          { borderLeftColor: colors.muted },
                        ]}
                      >
                        <Text style={styles.eventTitle}>{t.title}</Text>
                        <Text style={styles.eventMeta}>задача</Text>
                      </View>
                    ))}
                    {evs.length === 0 && tasks.length === 0 ? (
                      <Text style={styles.eventMeta}>Нет событий</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  topLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  todayBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  monthLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.ink,
    textTransform: 'capitalize',
    minWidth: 120,
    textAlign: 'center',
  },
  viewTabs: {
    flexDirection: 'row',
    marginHorizontal: space.md,
    marginBottom: space.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: 3,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  viewTabOn: {
    backgroundColor: colors.surface,
  },
  viewTabText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.muted,
  },
  viewTabTextOn: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: space.sm,
    marginBottom: 2,
  },
  weekday: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: fonts.sansMedium,
    color: colors.faint,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.sm,
  },
  cell: {
    minHeight: 72,
    paddingTop: 2,
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  dayNumWrap: {
    alignSelf: 'center',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayNumToday: {
    backgroundColor: '#1A73E8',
  },
  dayNumSelected: {
    backgroundColor: colors.accentSoft,
  },
  dayNum: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  dayNumTodayText: {
    color: '#fff',
    fontFamily: fonts.sansSemi,
  },
  dayNumSelectedText: {
    color: colors.accent,
    fontFamily: fonts.sansSemi,
  },
  chipsCol: {
    gap: 2,
    width: '100%',
  },
  miniChip: {
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  miniChipText: {
    fontSize: 9,
    fontFamily: fonts.sansMedium,
    color: '#fff',
  },
  moreText: {
    fontSize: 9,
    fontFamily: fonts.sans,
    color: colors.faint,
    paddingLeft: 2,
  },
  agendaPanel: {
    marginTop: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  agendaHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  agendaTitle: {
    flex: 1,
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  agendaAdd: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: '#1A73E8',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  eventBar: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 36,
    borderRadius: 2,
  },
  eventTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  eventMeta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  formDate: {
    marginTop: 8,
    marginBottom: 4,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  agendaBlock: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: space.lg,
  },
  agendaDateCol: {
    width: 48,
    alignItems: 'center',
  },
  agendaWeekday: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.faint,
    marginBottom: 4,
  },
  agendaDayBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaDayNum: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
  },
  agendaItems: {
    flex: 1,
    gap: 8,
    paddingTop: 2,
  },
  agendaCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});
