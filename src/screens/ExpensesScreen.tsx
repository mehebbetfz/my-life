import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { CategoryIcon } from '../components/CategoryIcon';
import { DateTimeField } from '../components/DateTimeField';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import {
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
  convertAmount,
  CURRENCIES,
  currencyInfo,
  DEFAULT_BASE_CURRENCY,
  type CurrencyCode,
} from '../lib/currency';
import {
  buildExpenseSuggestions,
  filterExpenseSuggestions,
  type ExpenseSuggestion,
} from '../lib/expenseSuggestions';
import { daysUntilDue, parseRemindAt } from '../lib/credits';
import {
  buildEnvelopes,
  financeTotals,
  planTotal,
} from '../lib/finance';
import { formatMoney, todayIso } from '../lib/storage';
import { colors, fonts, radii, space } from '../theme';
import {
  DEFAULT_BUDGET_PLAN,
  DEFAULT_ENVELOPES,
  ENVELOPE_COLORS,
  ENVELOPE_ICONS,
  type BudgetPlan,
  type ExpenseCategoryId,
} from '../types';

type Mode =
  | 'overview'
  | 'income'
  | 'expense'
  | 'plan'
  | 'currency'
  | 'rates'
  | 'envelope'
  | 'credit';

const DUE_DAY_PRESETS = [1, 5, 10, 15, 20, 25, 28];

function timeFromRemindAt(remindAt: string): Date {
  const { hour, minute } = parseRemindAt(remindAt);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function remindAtFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatRate(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const digits = n >= 100 ? 2 : n >= 1 ? 4 : 6;
  return n.toLocaleString('ru-RU', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 2,
  });
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ExpensesScreen() {
  const {
    data,
    addExpense,
    removeExpense,
    addIncome,
    removeIncome,
    updateBudgetPlan,
    setBaseCurrency,
    refreshFxRates,
    addEnvelope,
    updateEnvelope,
    removeEnvelope,
    addCredit,
    updateCredit,
    removeCredit,
  } = useData();
  const baseCurrency = data.baseCurrency ?? DEFAULT_BASE_CURRENCY;
  const categories = data.envelopes?.length
    ? data.envelopes
    : DEFAULT_ENVELOPES;
  const credits = data.credits ?? [];
  const [mode, setMode] = useState<Mode>('overview');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>(
    baseCurrency as CurrencyCode,
  );
  const [categoryId, setCategoryId] = useState<ExpenseCategoryId>(
    () => categories[0]?.id ?? 'food',
  );
  const [date, setDate] = useState(new Date());
  const [planDraft, setPlanDraft] = useState<BudgetPlan>(
    () => data.budgetPlan ?? DEFAULT_BUDGET_PLAN,
  );
  const [fxBusy, setFxBusy] = useState(false);
  const [showTitleSuggest, setShowTitleSuggest] = useState(false);
  const [editingEnvelopeId, setEditingEnvelopeId] = useState<string | null>(
    null,
  );
  const [envTitle, setEnvTitle] = useState('');
  const [envColor, setEnvColor] = useState(ENVELOPE_COLORS[0]);
  const [envIcon, setEnvIcon] = useState<string>('tag');
  const [envPercent, setEnvPercent] = useState('0');
  const [creditTitle, setCreditTitle] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDebt, setCreditDebt] = useState('');
  const [creditDueDay, setCreditDueDay] = useState(1);
  const [creditRemindTime, setCreditRemindTime] = useState(() =>
    timeFromRemindAt('09:00'),
  );
  const [creditNote, setCreditNote] = useState('');

  useEffect(() => {
    setEntryCurrency(baseCurrency as CurrencyCode);
  }, [baseCurrency]);

  useEffect(() => {
    if (!categories.some((c) => c.id === categoryId) && categories[0]) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const month = todayIso().slice(0, 7);
  const plan = data.budgetPlan ?? DEFAULT_BUDGET_PLAN;
  const incomes = data.incomes ?? [];
  const money = (n: number) => formatMoney(n, baseCurrency);

  const envelopes = useMemo(
    () => buildEnvelopes(incomes, data.expenses, plan, categories, month),
    [incomes, data.expenses, plan, categories, month],
  );

  const fxPairs = useMemo(() => {
    const rates = data.fxRates ?? {};
    const base = currencyInfo(baseCurrency);
    return CURRENCIES.filter((c) => c.code !== baseCurrency).map((c) => ({
      ...c,
      /** 1 валюта → сколько базовой (напр. 1 USD = 92 ₽) */
      toBase: convertAmount(1, c.code, baseCurrency, rates),
      /** 1 база → сколько валюты */
      fromBase: convertAmount(1, baseCurrency, c.code, rates),
      baseSymbol: base.symbol,
      baseCode: base.code,
    }));
  }, [baseCurrency, data.fxRates]);

  const fxUpdatedLabel = useMemo(() => {
    if (!data.fxUpdatedAt) return 'курс ещё не обновлялся';
    try {
      return `обновлено ${new Date(data.fxUpdatedAt).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return 'обновлено';
    }
  }, [data.fxUpdatedAt]);

  const totals = useMemo(
    () => financeTotals(envelopes, incomes, month),
    [envelopes, incomes, month],
  );

  const monthLabel = new Date().toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const monthIncomes = useMemo(
    () => incomes.filter((i) => i.date.startsWith(month)),
    [incomes, month],
  );

  const monthExpenses = useMemo(
    () => data.expenses.filter((e) => e.date.startsWith(month)),
    [data.expenses, month],
  );

  const expenseHistory = useMemo(
    () => buildExpenseSuggestions(data.expenses),
    [data.expenses],
  );

  const titleSuggestions = useMemo(
    () =>
      mode === 'expense'
        ? filterExpenseSuggestions(expenseHistory, title)
        : [],
    [mode, expenseHistory, title],
  );

  const applySuggestion = (s: ExpenseSuggestion) => {
    setTitle(s.title);
    setCategoryId(s.categoryId);
    const cur = CURRENCIES.some((c) => c.code === s.currency)
      ? (s.currency as CurrencyCode)
      : (baseCurrency as CurrencyCode);
    setEntryCurrency(cur);
    if (s.lastAmount > 0) {
      setAmount(String(s.lastAmount).replace('.', ','));
    }
    setShowTitleSuggest(false);
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDate(new Date());
    setEntryCurrency(baseCurrency as CurrencyCode);
    setShowTitleSuggest(false);
    setCreditTitle('');
    setCreditAmount('');
    setCreditDebt('');
    setCreditDueDay(1);
    setCreditRemindTime(timeFromRemindAt('09:00'));
    setCreditNote('');
    setMode('overview');
  };

  const openNewCredit = () => {
    setCreditTitle('');
    setCreditAmount('');
    setCreditDebt('');
    setCreditDueDay(1);
    setCreditRemindTime(timeFromRemindAt('09:00'));
    setCreditNote('');
    setEntryCurrency(baseCurrency as CurrencyCode);
    setMode('credit');
  };

  const onAddCredit = async () => {
    const value = Number(String(creditAmount).replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Сумма', 'Введи платёж больше 0');
      return;
    }
    if (!creditTitle.trim()) {
      Alert.alert('Название', 'Укажи название кредита');
      return;
    }
    const debtRaw = creditDebt.trim()
      ? Number(String(creditDebt).replace(',', '.'))
      : undefined;
    const remainingDebt =
      debtRaw != null && Number.isFinite(debtRaw) && debtRaw >= 0
        ? debtRaw
        : undefined;
    await addCredit({
      title: creditTitle.trim(),
      paymentAmount: value,
      currency: entryCurrency,
      dueDay: creditDueDay,
      remindAt: remindAtFromDate(creditRemindTime),
      remainingDebt,
      note: creditNote.trim() || undefined,
    });
    resetForm();
  };

  const parseAmount = () => {
    const value = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Сумма', 'Введи сумму больше 0');
      return null;
    }
    return value;
  };

  const convertedPreview = useMemo(() => {
    const value = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return null;
    if (entryCurrency === baseCurrency) return null;
    return convertAmount(value, entryCurrency, baseCurrency, data.fxRates);
  }, [amount, entryCurrency, baseCurrency, data.fxRates]);

  const onAddIncome = () => {
    const value = parseAmount();
    if (value == null) return;
    addIncome({
      title: title.trim() || 'Поступление',
      amount: value,
      currency: entryCurrency,
      date: toLocalDate(date),
    });
    resetForm();
  };

  const onAddExpense = () => {
    const value = parseAmount();
    if (value == null) return;
    if (!title.trim()) {
      Alert.alert('Название', 'Укажи, на что потратил');
      return;
    }
    const inBase = convertAmount(
      value,
      entryCurrency,
      baseCurrency,
      data.fxRates,
    );
    const env = envelopes.find((e) => e.categoryId === categoryId);
    const remaining = env?.remaining ?? 0;
    const commit = () => {
      addExpense({
        title,
        amount: value,
        currency: entryCurrency,
        categoryId,
        date: toLocalDate(date),
      });
      resetForm();
    };
    if (inBase > remaining) {
      Alert.alert(
        'Сверх лимита',
        `В «${env?.title}» осталось ${money(remaining)}. Всё равно списать ${money(inBase)}?`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Списать', style: 'destructive', onPress: commit },
        ],
      );
      return;
    }
    commit();
  };

  const onRefreshFx = async (opts?: { silent?: boolean }) => {
    setFxBusy(true);
    const ok = await refreshFxRates();
    setFxBusy(false);
    if (!opts?.silent) {
      Alert.alert(
        'Курсы',
        ok
          ? 'Курсы обновлены, суммы пересчитаны.'
          : 'Не удалось обновить. Используются сохранённые курсы.',
      );
    }
  };

  const onSavePlan = () => {
    const total = planTotal(planDraft, categories);
    if (Math.abs(total - 100) > 0.5) {
      Alert.alert(
        'План',
        `Сумма процентов сейчас ${total}%. Нужно ровно 100%.`,
      );
      return;
    }
    updateBudgetPlan(planDraft);
    setMode('overview');
  };

  const bumpPlan = (id: ExpenseCategoryId, delta: number) => {
    setPlanDraft((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, (prev[id] || 0) + delta)),
    }));
  };

  const openNewEnvelope = () => {
    setEditingEnvelopeId(null);
    setEnvTitle('');
    setEnvColor(
      ENVELOPE_COLORS[categories.length % ENVELOPE_COLORS.length],
    );
    setEnvIcon(
      ENVELOPE_ICONS[categories.length % ENVELOPE_ICONS.length],
    );
    setEnvPercent('0');
    setMode('envelope');
  };

  const openEditEnvelope = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setEditingEnvelopeId(id);
    setEnvTitle(cat.title);
    setEnvColor(cat.color);
    setEnvIcon(cat.icon || 'tag');
    setEnvPercent(String(plan[id] ?? 0));
    setMode('envelope');
  };

  const onSaveEnvelope = () => {
    const name = envTitle.trim();
    if (!name) {
      Alert.alert('Название', 'Укажи название конверта');
      return;
    }
    const pct = Math.max(0, Math.min(100, Number(envPercent) || 0));
    if (editingEnvelopeId) {
      updateEnvelope(editingEnvelopeId, {
        title: name,
        color: envColor,
        icon: envIcon,
      });
      updateBudgetPlan({ ...plan, [editingEnvelopeId]: pct });
    } else {
      addEnvelope({
        title: name,
        color: envColor,
        icon: envIcon,
        percent: pct,
      });
    }
    setMode('overview');
  };

  const confirmRemoveEnvelope = (id: string) => {
    if (categories.length <= 1) {
      Alert.alert('Конверты', 'Нужен хотя бы один конверт.');
      return;
    }
    const cat = categories.find((c) => c.id === id);
    const others = categories.filter((c) => c.id !== id);
    Alert.alert(
      'Удалить конверт?',
      `«${cat?.title}». Траты переедут в «${others[0]?.title}».`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeEnvelope(id, others[0]?.id);
            setMode('overview');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header
        title="Финансы"
        subtitle={`${monthLabel} · ${currencyInfo(baseCurrency).code}`}
        right={
          <View style={styles.headerActions}>
            <IconButton
              name="bar-chart-2"
              accessibilityLabel="Курсы валют"
              onPress={() => {
                setMode('rates');
                void onRefreshFx({ silent: true });
              }}
            />
            <IconButton
              name="sliders"
              accessibilityLabel="План и валюта"
              onPress={() => {
                setPlanDraft(plan);
                setMode('currency');
              }}
            />
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
            <View style={styles.summary}>
              <SummaryCard
                label="Остаток"
                value={money(totals.remainingTotal)}
                tone={
                  totals.remainingTotal < 0 ? 'danger' : 'success'
                }
                large
              />
              <View style={styles.summarySplit}>
                <SummaryCard
                  label="Поступило"
                  value={money(totals.incomeTotal)}
                  tone="info"
                />
                <SummaryCard
                  label="Потрачено"
                  value={money(totals.spentTotal)}
                  tone="danger"
                />
              </View>
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label="Поступление"
                icon="plus-circle"
                variant="soft"
                onPress={() => {
                  setEntryCurrency(baseCurrency as CurrencyCode);
                  setMode('income');
                }}
              />
              <PrimaryButton
                label="Трата"
                icon="minus-circle"
                onPress={() => {
                  setEntryCurrency(baseCurrency as CurrencyCode);
                  setMode('expense');
                }}
              />
            </View>

            <View style={styles.sectionHead}>
              <SectionLabel style={{ marginTop: 0, marginBottom: 0 }}>
                Конверты
              </SectionLabel>
              <Pressable onPress={openNewEnvelope} hitSlop={8}>
                <Text style={styles.linkAdd}>+ Добавить</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Нажми конверт, чтобы изменить. Долгое нажатие — удалить.
              Поступление делится по %.
            </Text>

            {envelopes.length === 0 ? (
              <EmptyHint>Добавь первый конверт.</EmptyHint>
            ) : (
              envelopes.map((env) => {
                const pctUsed =
                  env.allocated > 0
                    ? Math.min(100, (env.spent / env.allocated) * 100)
                    : env.spent > 0
                      ? 100
                      : 0;
                const over = env.remaining < 0;
                return (
                  <Pressable
                    key={env.categoryId}
                    style={styles.envelope}
                    onPress={() => openEditEnvelope(env.categoryId)}
                    onLongPress={() =>
                      confirmRemoveEnvelope(env.categoryId)
                    }
                  >
                    <View style={styles.envTop}>
                      <CategoryIcon
                        id={env.categoryId}
                        icon={env.icon}
                        color={env.color}
                      />
                      <Text style={styles.envTitle}>{env.title}</Text>
                      <Text style={styles.envPct}>{env.percent}%</Text>
                    </View>
                    <View style={styles.envNums}>
                      <Text style={styles.envMeta} numberOfLines={1}>
                        выделено {money(env.allocated)}
                      </Text>
                      <Text
                        style={[
                          styles.envRemain,
                          over && { color: colors.danger },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {over ? '−' : ''}
                        {money(Math.abs(env.remaining))}
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${pctUsed}%`,
                            backgroundColor: over
                              ? colors.danger
                              : env.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.envSpent}>
                      потрачено {money(env.spent)}
                    </Text>
                  </Pressable>
                );
              })
            )}

            <View style={styles.sectionHead}>
              <SectionLabel style={{ marginTop: 0, marginBottom: 0 }}>
                Кредиты
              </SectionLabel>
              <Pressable onPress={openNewCredit} hitSlop={8}>
                <Text style={styles.linkAdd}>+ Добавить</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Напоминание в выбранный день месяца. Долгое нажатие — удалить,
              нажатие — вкл/выкл уведомление.
            </Text>
            {credits.length === 0 ? (
              <EmptyHint>Кредитов пока нет.</EmptyHint>
            ) : (
              credits.map((item) => {
                const days = daysUntilDue(item);
                const when =
                  days === 0
                    ? 'сегодня'
                    : days === 1
                      ? 'завтра'
                      : `через ${days} дн.`;
                return (
                  <Row
                    key={item.id}
                    onPress={() =>
                      void updateCredit(item.id, { enabled: !item.enabled })
                    }
                    onLongPress={() =>
                      Alert.alert('Удалить кредит?', item.title, [
                        { text: 'Отмена', style: 'cancel' },
                        {
                          text: 'Удалить',
                          style: 'destructive',
                          onPress: () => void removeCredit(item.id),
                        },
                      ])
                    }
                  >
                    <View style={styles.histRow}>
                      <Icon
                        name="credit-card"
                        size={16}
                        color={
                          item.enabled ? colors.danger : colors.faint
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.itemTitle,
                            !item.enabled && { color: colors.faint },
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.meta}>
                          {item.enabled
                            ? `${when} · ${item.dueDay}-е · ${item.remindAt}`
                            : 'уведомления выкл'}
                          {item.remainingDebt != null
                            ? ` · долг ${money(item.remainingDebt)}`
                            : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.amount,
                          {
                            color: item.enabled
                              ? colors.danger
                              : colors.faint,
                          },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {money(item.paymentAmount)}
                      </Text>
                    </View>
                  </Row>
                );
              })
            )}

            <SectionLabel>Поступления</SectionLabel>
            {monthIncomes.length === 0 ? (
              <EmptyHint>Поступлений в этом месяце нет.</EmptyHint>
            ) : (
              monthIncomes.map((item) => (
                <Row
                  key={item.id}
                  onLongPress={() =>
                    Alert.alert('Удалить поступление?', item.title, [
                      { text: 'Отмена', style: 'cancel' },
                      {
                        text: 'Удалить',
                        style: 'destructive',
                        onPress: () => removeIncome(item.id),
                      },
                    ])
                  }
                >
                  <View style={styles.histRow}>
                    <Icon name="plus-circle" size={16} color={colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.meta}>
                        {item.date}
                        {item.currency &&
                        item.currency !== baseCurrency
                          ? ` · ${formatMoney(item.originalAmount ?? item.amount, item.currency)}`
                          : ''}
                      </Text>
                    </View>
                    <Text
                      style={[styles.amount, { color: colors.success }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      +{money(item.amount)}
                    </Text>
                  </View>
                </Row>
              ))
            )}

            <SectionLabel>Траты</SectionLabel>
            {monthExpenses.length === 0 ? (
              <EmptyHint>Трат пока нет.</EmptyHint>
            ) : (
              monthExpenses.map((item) => {
                const cat = categories.find(
                  (c) => c.id === item.categoryId,
                );
                return (
                  <Row
                    key={item.id}
                    onLongPress={() =>
                      Alert.alert('Удалить трату?', item.title, [
                        { text: 'Отмена', style: 'cancel' },
                        {
                          text: 'Удалить',
                          style: 'destructive',
                          onPress: () => removeExpense(item.id),
                        },
                      ])
                    }
                  >
                    <View style={styles.histRow}>
                      <CategoryIcon
                        id={cat?.id}
                        icon={cat?.icon}
                        color={cat?.color ?? colors.muted}
                        size={14}
                        box={26}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.meta}>
                          {cat?.title} · {item.date}
                          {item.currency &&
                          item.currency !== baseCurrency
                            ? ` · ${formatMoney(item.originalAmount ?? item.amount, item.currency)}`
                            : ''}
                        </Text>
                      </View>
                      <Text
                        style={styles.amount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        −{money(item.amount)}
                      </Text>
                    </View>
                  </Row>
                );
              })
            )}
      </ScrollView>

      <BottomSheet
        visible={mode === 'income'}
        onClose={resetForm}
        title="Новое поступление"
      >
        <Field
          placeholder="Зарплата, перевод…"
          value={title}
          onChangeText={setTitle}
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder={`Сумма (${entryCurrency})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <SectionLabel>Валюта поступления</SectionLabel>
        <View style={styles.chips}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c.code}
              label={`${c.code} ${c.symbol}`}
              selected={entryCurrency === c.code}
              onPress={() => setEntryCurrency(c.code)}
            />
          ))}
        </View>
        {convertedPreview != null && (
          <Text style={styles.convertHint}>
            ≈ {money(convertedPreview)} в основной валюте ({baseCurrency})
          </Text>
        )}
        <DateTimeField
          label="Дата"
          mode="date"
          value={date}
          onChange={setDate}
        />
        <Text style={styles.hint}>
          Сумма конвертируется в {baseCurrency} и делится по конвертам.
        </Text>
        <PrimaryButton
          label="Зачислить"
          icon="check"
          onPress={onAddIncome}
        />
      </BottomSheet>

      <BottomSheet
        visible={mode === 'expense'}
        onClose={resetForm}
        title="Новая трата"
      >
        <Field
          placeholder="На что"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setShowTitleSuggest(true);
          }}
          onFocus={() => setShowTitleSuggest(true)}
          autoCorrect={false}
        />
        {showTitleSuggest && titleSuggestions.length > 0 ? (
          <View style={styles.suggestBox}>
            {titleSuggestions.map((s) => {
              const cat = categories.find((c) => c.id === s.categoryId);
              return (
                <Pressable
                  key={`${s.title}-${s.categoryId}-${s.currency}`}
                  style={styles.suggestRow}
                  onPress={() => applySuggestion(s)}
                >
                  <CategoryIcon
                    id={cat?.id}
                    icon={cat?.icon}
                    color={cat?.color ?? colors.muted}
                    size={13}
                    box={24}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Text style={styles.suggestMeta} numberOfLines={1}>
                      {cat?.title ?? 'Категория'} · {s.currency}
                      {s.count > 1 ? ` · ${s.count}×` : ''}
                    </Text>
                  </View>
                  <Text style={styles.suggestAmount}>
                    {formatMoney(s.lastAmount, s.currency)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Field
          style={{ marginTop: 8 }}
          placeholder={`Сумма (${entryCurrency})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          onFocus={() => setShowTitleSuggest(false)}
        />
        <SectionLabel>Валюта траты</SectionLabel>
        <View style={styles.chips}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c.code}
              label={`${c.code} ${c.symbol}`}
              selected={entryCurrency === c.code}
              onPress={() => setEntryCurrency(c.code)}
            />
          ))}
        </View>
        {convertedPreview != null && (
          <Text style={styles.convertHint}>
            ≈ {money(convertedPreview)} в {baseCurrency}
          </Text>
        )}
        <SectionLabel>Категория</SectionLabel>
        <View style={styles.chips}>
          {envelopes.map((c) => (
            <Chip
              key={c.categoryId}
              label={`${c.title} · ${money(c.remaining)}`}
              tone={c.color}
              icon={(c.icon || 'tag') as IconName}
              selected={categoryId === c.categoryId}
              onPress={() => setCategoryId(c.categoryId)}
            />
          ))}
        </View>
        <DateTimeField
          label="Дата"
          mode="date"
          value={date}
          onChange={setDate}
        />
        <PrimaryButton
          label="Списать"
          icon="check"
          onPress={onAddExpense}
        />
      </BottomSheet>

      <BottomSheet
        visible={mode === 'rates'}
        onClose={resetForm}
        title="Курсы валют"
      >
        <Text style={styles.hint}>
          Относительно {currencyInfo(baseCurrency).title} ({baseCurrency}).{' '}
          {fxUpdatedLabel}.
        </Text>
        {fxPairs.map((p) => (
          <View key={p.code} style={styles.rateRow}>
            <View style={styles.rateLeft}>
              <Text style={styles.rateCode}>
                {p.code} · {p.symbol}
              </Text>
              <Text style={styles.rateTitle}>{p.title}</Text>
            </View>
            <View style={styles.rateRight}>
              <Text style={styles.rateMain}>
                1 {p.symbol} = {formatRate(p.toBase)} {p.baseSymbol}
              </Text>
              <Text style={styles.rateSub}>
                1 {p.baseSymbol} = {formatRate(p.fromBase)} {p.symbol}
              </Text>
            </View>
          </View>
        ))}
        <PrimaryButton
          label={fxBusy ? 'Обновление…' : 'Обновить сейчас'}
          icon="refresh-cw"
          variant="soft"
          disabled={fxBusy}
          onPress={() => void onRefreshFx()}
        />
      </BottomSheet>

      <BottomSheet
        visible={mode === 'currency'}
        onClose={resetForm}
        title="Валюта и план"
      >
        <SectionLabel>Основная валюта</SectionLabel>
        <Text style={styles.hint}>
          Все конверты и итоги ведутся в этой валюте. Поступления в других
          валютах конвертируются по курсу.
        </Text>
        <View style={styles.chips}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c.code}
              label={`${c.code} · ${c.title}`}
              selected={baseCurrency === c.code}
              onPress={() => setBaseCurrency(c.code)}
            />
          ))}
        </View>
        <PrimaryButton
          label={fxBusy ? 'Обновление…' : 'Обновить курсы'}
          icon="refresh-cw"
          variant="soft"
          disabled={fxBusy}
          onPress={() => void onRefreshFx()}
        />
        <PrimaryButton
          label="План распределения %"
          icon="sliders"
          onPress={() => {
            setPlanDraft(plan);
            setMode('plan');
          }}
        />
        <PrimaryButton
          label="Новый конверт"
          icon="plus"
          variant="soft"
          onPress={openNewEnvelope}
        />
      </BottomSheet>

      <BottomSheet
        visible={mode === 'plan'}
        onClose={resetForm}
        title="План распределения"
      >
        <Text style={styles.hint}>
          Проценты от каждого поступления. Сумма должна быть 100%.
        </Text>
        {categories.map((c) => (
          <View key={c.id} style={styles.planRow}>
            <CategoryIcon id={c.id} icon={c.icon} color={c.color} box={26} size={14} />
            <Text style={styles.planTitle}>{c.title}</Text>
            <Pressable
              style={styles.step}
              onPress={() => bumpPlan(c.id, -1)}
            >
              <Icon name="minus" size={16} color={colors.ink} />
            </Pressable>
            <Text style={styles.planPct}>{planDraft[c.id] ?? 0}%</Text>
            <Pressable
              style={styles.step}
              onPress={() => bumpPlan(c.id, 1)}
            >
              <Icon name="plus" size={16} color={colors.ink} />
            </Pressable>
          </View>
        ))}
        <Text
          style={[
            styles.planTotal,
            Math.abs(planTotal(planDraft, categories) - 100) > 0.5 && {
              color: colors.danger,
            },
          ]}
        >
          Итого {planTotal(planDraft, categories)}%
        </Text>
        <PrimaryButton
          label="Сохранить план"
          icon="check"
          onPress={onSavePlan}
        />
      </BottomSheet>

      <BottomSheet
        visible={mode === 'envelope'}
        onClose={resetForm}
        title={editingEnvelopeId ? 'Конверт' : 'Новый конверт'}
      >
        <Field
          placeholder="Название"
          value={envTitle}
          onChangeText={setEnvTitle}
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder="% от поступления"
          value={envPercent}
          onChangeText={setEnvPercent}
          keyboardType="number-pad"
        />
        <SectionLabel>Иконка</SectionLabel>
        <View style={styles.iconRow}>
          {ENVELOPE_ICONS.map((name) => {
            const on = envIcon === name;
            return (
              <Pressable
                key={name}
                onPress={() => setEnvIcon(name)}
                style={[
                  styles.iconSwatch,
                  on && {
                    borderColor: envColor,
                    backgroundColor: `${envColor}22`,
                  },
                ]}
              >
                <Icon
                  name={name as IconName}
                  size={18}
                  color={on ? envColor : colors.muted}
                />
              </Pressable>
            );
          })}
        </View>
        <SectionLabel>Цвет</SectionLabel>
        <View style={styles.colorRow}>
          {ENVELOPE_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setEnvColor(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                envColor === c && styles.colorSwatchOn,
              ]}
            />
          ))}
        </View>
        <PrimaryButton
          label={editingEnvelopeId ? 'Сохранить' : 'Создать'}
          icon="check"
          onPress={onSaveEnvelope}
        />
        {editingEnvelopeId ? (
          <PrimaryButton
            label="Удалить конверт"
            variant="ghost"
            onPress={() => confirmRemoveEnvelope(editingEnvelopeId)}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={mode === 'credit'}
        onClose={resetForm}
        title="Новый кредит"
        footer={
          <PrimaryButton
            label="Сохранить"
            icon="check"
            onPress={() => void onAddCredit()}
          />
        }
      >
        <Field
          placeholder="Название (ипотека, авто…)"
          value={creditTitle}
          onChangeText={setCreditTitle}
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder={`Ежемесячный платёж (${entryCurrency})`}
          value={creditAmount}
          onChangeText={setCreditAmount}
          keyboardType="decimal-pad"
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder="Остаток долга (необязательно)"
          value={creditDebt}
          onChangeText={setCreditDebt}
          keyboardType="decimal-pad"
        />
        <SectionLabel>Валюта</SectionLabel>
        <View style={styles.chips}>
          {CURRENCIES.map((c) => (
            <Chip
              key={c.code}
              label={`${c.code} ${c.symbol}`}
              selected={entryCurrency === c.code}
              onPress={() => setEntryCurrency(c.code)}
            />
          ))}
        </View>
        <SectionLabel>День платежа</SectionLabel>
        <View style={styles.chips}>
          {DUE_DAY_PRESETS.map((d) => (
            <Chip
              key={d}
              label={`${d}`}
              selected={creditDueDay === d}
              onPress={() => setCreditDueDay(d)}
            />
          ))}
        </View>
        <DateTimeField
          label="Время уведомления"
          mode="time"
          value={creditRemindTime}
          onChange={setCreditRemindTime}
        />
        <Field
          style={{ marginTop: 8 }}
          placeholder="Заметка"
          value={creditNote}
          onChangeText={setCreditNote}
        />
        <Text style={styles.hint}>
          Уведомление каждый месяц в выбранный день. За 5 дней до платежа
          сверху появится красное напоминание.
        </Text>
      </BottomSheet>
    </Screen>
  );
}

const SUMMARY_TONES = {
  success: {
    bg: '#E8F5EE',
    label: '#2F6B4F',
    value: '#1F7A4D',
  },
  info: {
    bg: '#E8F0FA',
    label: '#3B6EA5',
    value: '#2563EB',
  },
  danger: {
    bg: '#FCECEC',
    label: '#A33B3B',
    value: '#D14040',
  },
} as const;

function SummaryCard({
  label,
  value,
  tone,
  large,
}: {
  label: string;
  value: string;
  tone: keyof typeof SUMMARY_TONES;
  large?: boolean;
}) {
  const t = SUMMARY_TONES[tone];
  return (
    <View
      style={[
        styles.summaryCard,
        large && styles.summaryCardLarge,
        { backgroundColor: t.bg },
      ]}
    >
      <Text style={[styles.summaryLabel, { color: t.label }]}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          large && styles.summaryValueLarge,
          { color: t.value },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  suggestBox: {
    marginTop: 6,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  suggestTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
  },
  suggestMeta: {
    marginTop: 1,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  suggestAmount: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    color: colors.faint,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rateLeft: { flex: 1, minWidth: 0 },
  rateCode: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
  },
  rateTitle: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  rateRight: { alignItems: 'flex-end', maxWidth: '58%' },
  rateMain: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.ink,
    textAlign: 'right',
  },
  rateSub: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.faint,
    textAlign: 'right',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.md,
    marginBottom: space.sm,
  },
  linkAdd: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.accent,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: space.md,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: space.sm,
  },
  iconSwatch: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchOn: {
    borderColor: colors.ink,
  },
  convertHint: {
    marginTop: 4,
    marginBottom: 8,
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.accent,
  },
  summary: {
    gap: 8,
    marginBottom: space.md,
  },
  summarySplit: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  summaryCardLarge: {
    flex: undefined,
    width: '100%',
    paddingVertical: 16,
  },
  summaryLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 4,
    fontFamily: fonts.sansSemi,
    fontSize: 16,
  },
  summaryValueLarge: {
    marginTop: 6,
    fontFamily: fonts.serif,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  actions: { gap: 8, marginBottom: space.md },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: space.sm,
  },
  envelope: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space.md,
    marginBottom: 8,
  },
  envTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  envTitle: {
    flex: 1,
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
  },
  envPct: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.faint,
  },
  envNums: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  envMeta: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  envRemain: {
    flexShrink: 1,
    maxWidth: '55%',
    textAlign: 'right',
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    color: colors.ink,
  },
  envSpent: {
    marginTop: 6,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.faint,
  },
  track: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  itemTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
  amount: {
    flexShrink: 0,
    maxWidth: '42%',
    textAlign: 'right',
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  planTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  planPct: {
    width: 44,
    textAlign: 'center',
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTotal: {
    marginVertical: 12,
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },
});
