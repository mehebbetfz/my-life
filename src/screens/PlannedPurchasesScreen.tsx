import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
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
  convertAmount,
  CURRENCIES,
  DEFAULT_BASE_CURRENCY,
  type CurrencyCode,
} from '../lib/currency';
import { formatMoney } from '../lib/storage';
import { colors, fonts, radii, space } from '../theme';
import type { PlannedPurchase } from '../types';

type Mode = 'overview' | 'create' | 'contribute';

export function PlannedPurchasesScreen() {
  const {
    data,
    addPlannedPurchase,
    contributeToPurchase,
    markPurchaseBought,
    removePlannedPurchase,
  } = useData();
  const base = data.baseCurrency ?? DEFAULT_BASE_CURRENCY;
  const money = (n: number) => formatMoney(n, base);

  const [mode, setMode] = useState<Mode>('overview');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(base as CurrencyCode);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBought, setShowBought] = useState(false);

  const list = useMemo(() => {
    const items = data.plannedPurchases ?? [];
    return items
      .filter((p) => (showBought ? p.bought : !p.bought))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.plannedPurchases, showBought]);

  const active = (data.plannedPurchases ?? []).find((p) => p.id === activeId);

  const convertedPreview = useMemo(() => {
    const value = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return null;
    if (currency === base) return null;
    return convertAmount(value, currency, base, data.fxRates);
  }, [amount, currency, base, data.fxRates]);

  const reset = () => {
    setMode('overview');
    setTitle('');
    setAmount('');
    setCurrency(base as CurrencyCode);
    setActiveId(null);
  };

  const onCreate = () => {
    const value = Number(String(amount).replace(',', '.'));
    if (!title.trim()) {
      Alert.alert('Название', 'Что планируешь купить?');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Цена', 'Укажи целевую сумму');
      return;
    }
    addPlannedPurchase({
      title: title.trim(),
      amount: value,
      currency,
    });
    reset();
  };

  const onContribute = () => {
    if (!activeId) return;
    const value = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Сумма', 'Сколько отложить?');
      return;
    }
    contributeToPurchase(activeId, value, currency);
    reset();
  };

  const openContribute = (item: PlannedPurchase) => {
    setActiveId(item.id);
    setAmount('');
    setCurrency(base as CurrencyCode);
    setMode('contribute');
  };

  const confirmBought = (item: PlannedPurchase) => {
    Alert.alert('Куплено?', item.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Только отметить',
        onPress: () => markPurchaseBought(item.id, false),
      },
      {
        text: 'И списать как трату',
        onPress: () => markPurchaseBought(item.id, true),
      },
    ]);
  };

  const confirmRemove = (item: PlannedPurchase) => {
    Alert.alert('Удалить?', item.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => removePlannedPurchase(item.id),
      },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Покупки"
        subtitle="Планируемые · копилка"
        right={
          <IconButton
            name="plus"
            onPress={() => {
              setCurrency(base as CurrencyCode);
              setTitle('');
              setAmount('');
              setMode('create');
            }}
          />
        }
      />

      <View style={styles.filters}>
        <Chip
          label="Коплю"
          selected={!showBought}
          onPress={() => setShowBought(false)}
        />
        <Chip
          label="Куплено"
          selected={showBought}
          onPress={() => setShowBought(true)}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {list.length === 0 ? (
          <EmptyHint>
            {showBought
              ? 'Пока нет купленных.'
              : 'Добавь желаемую покупку и откладывай на неё.'}
          </EmptyHint>
        ) : (
          list.map((item) => {
            const pct =
              item.targetAmount > 0
                ? Math.min(
                    100,
                    Math.round((item.savedAmount / item.targetAmount) * 100),
                  )
                : 0;
            const left = Math.max(0, item.targetAmount - item.savedAmount);
            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onLongPress={() => confirmRemove(item)}
              >
                <View style={styles.cardTop}>
                  <Text
                    style={[
                      styles.cardTitle,
                      item.bought && styles.boughtTitle,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.cardTarget}>
                    {money(item.targetAmount)}
                  </Text>
                </View>
                {item.currency !== base ? (
                  <Text style={styles.meta}>
                    цель {formatMoney(item.originalTarget, item.currency)}
                  </Text>
                ) : null}
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${pct}%`,
                        backgroundColor: item.bought
                          ? colors.success
                          : colors.accent,
                      },
                    ]}
                  />
                </View>
                <View style={styles.cardNums}>
                  <Text style={styles.meta}>
                    отложено {money(item.savedAmount)} · {pct}%
                  </Text>
                  {!item.bought ? (
                    <Text style={styles.left}>ещё {money(left)}</Text>
                  ) : (
                    <Text style={[styles.left, { color: colors.success }]}>
                      готово
                    </Text>
                  )}
                </View>
                {!item.bought ? (
                  <View style={styles.cardActions}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label="Отложить"
                        icon="plus-circle"
                        variant="soft"
                        onPress={() => openContribute(item)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label="Купил"
                        icon="check"
                        onPress={() => confirmBought(item)}
                      />
                    </View>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <BottomSheet
        visible={mode === 'create'}
        onClose={reset}
        title="Новая покупка"
      >
        <Field
          placeholder="Что купить"
          value={title}
          onChangeText={setTitle}
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder={`Цена (${currency})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <SectionLabel>Валюта цены</SectionLabel>
        <View style={styles.filters}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c.code}
              label={`${c.code} ${c.symbol}`}
              selected={currency === c.code}
              onPress={() => setCurrency(c.code)}
            />
          ))}
        </View>
        {convertedPreview != null ? (
          <Text style={styles.convert}>≈ {money(convertedPreview)}</Text>
        ) : null}
        <PrimaryButton label="Добавить" icon="check" onPress={onCreate} />
      </BottomSheet>

      <BottomSheet
        visible={mode === 'contribute'}
        onClose={reset}
        title={active ? `Отложить · ${active.title}` : 'Отложить'}
      >
        {active ? (
          <Text style={styles.hint}>
            Цель {money(active.targetAmount)} · уже{' '}
            {money(active.savedAmount)}
          </Text>
        ) : null}
        <Field
          placeholder={`Сумма (${currency})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <SectionLabel>Валюта</SectionLabel>
        <View style={styles.filters}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c.code}
              label={`${c.code} ${c.symbol}`}
              selected={currency === c.code}
              onPress={() => setCurrency(c.code)}
            />
          ))}
        </View>
        {convertedPreview != null ? (
          <Text style={styles.convert}>≈ {money(convertedPreview)}</Text>
        ) : null}
        <PrimaryButton
          label="Отложить"
          icon="plus-circle"
          onPress={onContribute}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap' },
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
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    color: colors.ink,
  },
  boughtTitle: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  cardTarget: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  track: {
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  cardNums: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.accent,
  },
  cardActions: {
    marginTop: space.md,
    flexDirection: 'row',
    gap: 8,
  },
  convert: {
    marginVertical: 8,
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.accent,
  },
  hint: {
    marginBottom: space.sm,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
});
