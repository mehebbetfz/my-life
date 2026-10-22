import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

type Mode = 'date' | 'time';

export function DateTimeField({
  label,
  value,
  mode,
  onChange,
}: {
  label: string;
  value: Date;
  mode: Mode;
  onChange: (next: Date) => void;
}) {
  const [open, setOpen] = useState(false);

  const display =
    mode === 'date'
      ? value.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : value.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });

  const onPick = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (selected) onChange(selected);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
        onPress={() => setOpen((v) => (Platform.OS === 'ios' ? !v : true))}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
      >
        <Text style={styles.value} numberOfLines={1}>
          {display}
        </Text>
        <Icon
          name={mode === 'date' ? 'calendar' : 'clock'}
          size={18}
          color={colors.faint}
        />
      </Pressable>

      {open && Platform.OS === 'ios' && (
        <View style={styles.pickerBox}>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            onChange={onPick}
            locale="ru-RU"
            style={styles.picker}
          />
          <Pressable style={styles.done} onPress={() => setOpen(false)}>
            <Text style={styles.doneText}>Готово</Text>
          </Pressable>
        </View>
      )}

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={onPick}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10, marginTop: 4 },
  label: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
    color: colors.faint,
    marginBottom: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  fieldPressed: {
    opacity: 0.85,
  },
  value: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
  pickerBox: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  picker: {
    alignSelf: 'stretch',
    height: 180,
  },
  done: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  doneText: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.accent,
  },
});
