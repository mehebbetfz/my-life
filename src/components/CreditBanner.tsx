import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import {
  creditBannerLine,
  isCreditUrgent,
} from '../lib/credits';
import { DEFAULT_BASE_CURRENCY } from '../lib/currency';
import { colors, fonts, space } from '../theme';
import { Icon } from './Icon';

/** Красный баннер сверху: ближайшие платежи по кредитам (≤5 дней). */
export function CreditBanner() {
  const insets = useSafeAreaInsets();
  const { data } = useData();
  const [dismissed, setDismissed] = useState(false);

  const urgent = useMemo(
    () => (data.credits ?? []).filter((c) => isCreditUrgent(c)),
    [data.credits],
  );

  if (dismissed || urgent.length === 0) return null;

  const base = data.baseCurrency ?? DEFAULT_BASE_CURRENCY;

  return (
    <View style={[styles.banner, { paddingTop: Math.max(insets.top, 10) }]}>
      <Icon name="alert-circle" size={18} color="#fff" />
      <View style={styles.body}>
        <Text style={styles.title}>Скоро платёж по кредиту</Text>
        {urgent.map((c) => (
          <Text key={c.id} style={styles.line} numberOfLines={2}>
            {creditBannerLine(c, base)}
          </Text>
        ))}
      </View>
      <Pressable
        onPress={() => setDismissed(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Скрыть"
      >
        <Icon name="x" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    paddingHorizontal: space.lg,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  body: { flex: 1, gap: 2 },
  title: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.sansSemi,
    marginBottom: 2,
  },
  line: {
    color: '#FFE8E8',
    fontSize: 13,
    fontFamily: fonts.sans,
    lineHeight: 18,
  },
});
