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
import {
  BOOK_THEMES,
  bookKey,
  type RecommendedBook,
} from '../lib/bookRecommendations';
import { colors, fonts, radii, space } from '../theme';
import type { Book } from '../types';

type Filter = 'reading' | 'done' | 'all' | 'top';

const SPINE_COLORS = [
  '#9B2226',
  '#1D3557',
  '#2D6A4F',
  '#BC6C25',
  '#6A4C93',
  '#457B9D',
  '#EA4B71',
  '#0D9488',
  '#7C3AED',
  '#CA8A04',
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function spineColor(book: Book, index: number): string {
  let hash = 0;
  for (let i = 0; i < book.id.length; i++) {
    hash = (hash + book.id.charCodeAt(i) * (i + 1)) % 997;
  }
  return SPINE_COLORS[(hash + index) % SPINE_COLORS.length];
}

function Bookshelf({
  books,
  onPress,
  onLongPress,
}: {
  books: Book[];
  onPress: (id: string) => void;
  onLongPress: (book: Book) => void;
}) {
  const { width } = useWindowDimensions();
  const pad = space.xl * 2;
  const shelfInner = Math.max(280, width - pad - 24);
  const perRow = Math.max(4, Math.min(7, Math.floor(shelfInner / 44)));
  const rows = chunk(books, perRow);

  if (books.length === 0) {
    return <EmptyHint>Полка пока пустая — отметь книгу прочитанной.</EmptyHint>;
  }

  return (
    <View style={styles.shelfBlock}>
      {rows.map((row, rowIndex) => (
        <View key={`shelf-${rowIndex}`} style={styles.shelfUnit}>
          <View style={styles.booksRow}>
            {row.map((book, i) => {
              const bg = spineColor(book, rowIndex * perRow + i);
              const label =
                book.title.length > 18
                  ? `${book.title.slice(0, 16)}…`
                  : book.title;
              return (
                <Pressable
                  key={book.id}
                  onPress={() => onPress(book.id)}
                  onLongPress={() => onLongPress(book)}
                  style={({ pressed }) => [
                    styles.spine,
                    { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
                  ]}
                  accessibilityLabel={book.title}
                >
                  <View style={styles.spineBand} />
                  <View style={styles.spineTitleWrap}>
                    <Text style={styles.spineTitle} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                  <View style={[styles.spineBand, styles.spineBandBottom]} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.shelfBoard}>
            <View style={styles.shelfEdge} />
            <View style={styles.shelfShadow} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function BooksScreen() {
  const { data, addBook, toggleBook, removeBook } = useData();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [filter, setFilter] = useState<Filter>('reading');

  const reading = useMemo(
    () =>
      [...(data.books ?? [])]
        .filter((b) => !b.done)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.books],
  );

  const done = useMemo(
    () =>
      [...(data.books ?? [])]
        .filter((b) => b.done)
        .sort((a, b) => (b.doneAt ?? b.createdAt).localeCompare(a.doneAt ?? a.createdAt)),
    [data.books],
  );

  const ownedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of data.books ?? []) {
      set.add(bookKey(b.title, b.author));
    }
    return set;
  }, [data.books]);

  const onAdd = () => {
    if (!title.trim()) return;
    addBook({ title, author: author || undefined });
    setTitle('');
    setAuthor('');
    setShowForm(false);
  };

  const addRecommended = (book: RecommendedBook) => {
    if (ownedKeys.has(bookKey(book.title, book.author))) {
      Alert.alert('Уже в списке', `«${book.title}» уже добавлена.`);
      return;
    }
    addBook({
      title: book.title,
      author: book.author,
      note: book.why,
    });
  };

  const confirmRemove = (book: Book) => {
    Alert.alert('Удалить?', book.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => removeBook(book.id),
      },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Книги"
        subtitle={
          filter === 'top'
            ? 'Топ для саморазвития'
            : done.length > 0
              ? `На полке ${done.length}`
              : 'Список для чтения'
        }
        right={
          <IconButton name="plus" onPress={() => setShowForm(true)} />
        }
      />

      <View style={styles.filters}>
        <Chip
          label="Читаю"
          selected={filter === 'reading'}
          onPress={() => setFilter('reading')}
        />
        <Chip
          label="Полка"
          selected={filter === 'done'}
          onPress={() => setFilter('done')}
        />
        <Chip
          label="Топ"
          selected={filter === 'top'}
          onPress={() => setFilter('top')}
        />
        <Chip
          label="Все"
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
      </View>

      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Новая книга"
      >
        <Field
          placeholder="Название"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={onAdd}
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder="Автор (необязательно)"
          value={author}
          onChangeText={setAuthor}
        />
        <PrimaryButton label="Добавить" icon="check" onPress={onAdd} />
      </BottomSheet>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {filter === 'top' && (
          <>
            <Text style={styles.hint}>
              Подборка книг, которые чаще всего советуют. Тап «В список» —
              добавить в «Читаю».
            </Text>
            {BOOK_THEMES.map((theme) => (
              <View key={theme.id} style={styles.themeBlock}>
                <View style={styles.themeHead}>
                  <View
                    style={[styles.themeDot, { backgroundColor: theme.color }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.themeTitle}>{theme.title}</Text>
                    <Text style={styles.themeHint}>{theme.hint}</Text>
                  </View>
                </View>
                {theme.books.map((book) => {
                  const owned = ownedKeys.has(
                    bookKey(book.title, book.author),
                  );
                  return (
                    <View key={`${theme.id}-${book.title}`} style={styles.recCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{book.title}</Text>
                        <Text style={styles.meta}>{book.author}</Text>
                        <Text style={styles.why}>{book.why}</Text>
                      </View>
                      <Pressable
                        disabled={owned}
                        onPress={() => addRecommended(book)}
                        style={[
                          styles.addBtn,
                          owned && styles.addBtnDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.addBtnText,
                            owned && styles.addBtnTextDone,
                          ]}
                        >
                          {owned ? 'Есть' : '+ Список'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </>
        )}

        {(filter === 'done' || filter === 'all') && (
          <>
            <SectionLabel>Прочитанное · полка</SectionLabel>
            <Text style={styles.hint}>
              Тап — вернуть в «читаю». Долгое нажатие — удалить.
            </Text>
            <Bookshelf
              books={done}
              onPress={(id) => toggleBook(id)}
              onLongPress={confirmRemove}
            />
          </>
        )}

        {(filter === 'reading' || filter === 'all') && (
          <>
            {filter === 'all' ? (
              <SectionLabel>Сейчас читаю</SectionLabel>
            ) : null}
            {reading.length === 0 ? (
              <EmptyHint>
                Добавь книгу или открой вкладку «Топ» — там готовые рекомендации.
              </EmptyHint>
            ) : (
              reading.map((item) => (
                <Row
                  key={item.id}
                  onPress={() => toggleBook(item.id)}
                  onLongPress={() => confirmRemove(item)}
                >
                  <View style={styles.line}>
                    <Check done={false} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.author ? (
                        <Text style={styles.meta}>{item.author}</Text>
                      ) : null}
                      <Text style={styles.putHint}>тап → на полку</Text>
                    </View>
                  </View>
                </Row>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: {
    marginBottom: space.sm,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  shelfBlock: {
    marginBottom: space.lg,
    gap: 4,
  },
  shelfUnit: {
    marginBottom: 10,
  },
  booksRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 118,
  },
  spine: {
    width: 36,
    height: 110,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  spineBand: {
    width: '70%',
    height: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  spineBandBottom: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  spineTitleWrap: {
    flex: 1,
    width: 110,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  spineTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  shelfBoard: {
    marginTop: 0,
    height: 14,
    borderRadius: radii.sm,
    backgroundColor: '#C4A574',
    borderBottomWidth: 3,
    borderBottomColor: '#8B6914',
    overflow: 'hidden',
  },
  shelfEdge: {
    height: 4,
    backgroundColor: '#E8D5A8',
  },
  shelfShadow: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: -6,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },
  meta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  putHint: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.faint,
  },
  themeBlock: {
    marginBottom: space.lg,
  },
  themeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: space.sm,
  },
  themeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  themeTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
  },
  themeHint: {
    marginTop: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: 8,
  },
  why: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.faint,
    lineHeight: 16,
  },
  addBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBtnDone: {
    backgroundColor: colors.bg,
  },
  addBtnText: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.accent,
  },
  addBtnTextDone: {
    color: colors.faint,
  },
});
