import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, space } from '../theme';
import type { Priority } from '../types';
import { Icon } from './Icon';

export const PRIORITY_OPTIONS: {
  id: Priority;
  title: string;
  color: string;
}[] = [
  { id: 'high', title: 'Высокий', color: '#D14040' },
  { id: 'medium', title: 'Средний', color: '#D4A017' },
  { id: 'low', title: 'Низкий', color: '#1F7A4D' },
];

export function priorityMeta(id: Priority) {
  return (
    PRIORITY_OPTIONS.find((p) => p.id === id) ?? PRIORITY_OPTIONS[1]
  );
}

export function PriorityFlag({
  priority,
  size = 14,
}: {
  priority: Priority;
  size?: number;
}) {
  const meta = priorityMeta(priority);
  return <Icon name="flag" size={size} color={meta.color} />;
}

export function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (next: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = priorityMeta(value);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          open && styles.triggerOpen,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Приоритет: ${current.title}`}
      >
        <Icon name="flag" size={16} color={current.color} />
        <Text style={styles.triggerLabel}>Приоритет</Text>
        <Text style={[styles.triggerValue, { color: current.color }]}>
          {current.title}
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.faint}
        />
      </Pressable>

      {open ? (
        <View style={styles.tooltip}>
          <View style={styles.tooltipArrow} />
          {PRIORITY_OPTIONS.map((opt) => {
            const selected = value === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.option, selected && styles.optionOn]}
                onPress={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <Icon name="flag" size={18} color={opt.color} />
                <Text style={styles.optionTitle}>{opt.title}</Text>
                {selected ? (
                  <Icon name="check" size={16} color={colors.accent} />
                ) : (
                  <View style={{ width: 16 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 4,
    zIndex: 2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerOpen: {
    borderColor: colors.accent,
  },
  triggerLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  triggerValue: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  tooltip: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    left: 18,
    width: 10,
    height: 10,
    backgroundColor: colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    transform: [{ rotate: '45deg' }],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  optionOn: {
    backgroundColor: colors.accentSoft,
  },
  optionTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
});
