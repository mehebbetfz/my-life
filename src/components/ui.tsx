import { DrawerActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, space } from '../theme';
import { Icon, type IconName } from './Icon';

export function Screen({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: Math.max(insets.top, 8) },
        padded && styles.screenPad,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function MenuButton() {
  const navigation = useNavigation();
  return (
    <IconButton
      name="menu"
      accessibilityLabel="Открыть меню"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
}

export function Header({
  title,
  subtitle,
  right,
  showMenu = true,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showMenu?: boolean;
}) {
  return (
    <View style={styles.header}>
      {showMenu ? <MenuButton /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
}

/** @deprecated prefer Header */
export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

/** @deprecated prefer Header */
export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={[styles.subtitle, { marginBottom: space.lg }]}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      {...props}
      style={[styles.field, props.style]}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  variant = 'solid',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
  variant?: 'solid' | 'ghost' | 'soft';
}) {
  const isSolid = variant === 'solid';
  const isSoft = variant === 'soft';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        isSolid && styles.btnSolid,
        isSoft && styles.btnSoft,
        variant === 'ghost' && styles.btnGhost,
        (pressed || disabled) && { opacity: 0.65 },
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={isSolid ? '#fff' : colors.accent}
        />
      ) : null}
      <Text
        style={[
          styles.btnText,
          !isSolid && { color: colors.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone,
  icon,
}: {
  label: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: string;
  icon?: IconName;
}) {
  const accent = tone ?? colors.accent;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: accent, borderColor: accent },
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={14}
          color={selected ? '#fff' : accent}
        />
      ) : null}
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({
  children,
  onPress,
  onLongPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && { backgroundColor: colors.accentSoft },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export function Check({ done }: { done?: boolean }) {
  return (
    <View style={[styles.check, done && styles.checkDone]}>
      {done ? <Icon name="check" size={12} color="#fff" /> : null}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
}: {
  name: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon name={name} size={18} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenPad: {
    paddingHorizontal: space.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    marginBottom: space.lg,
    paddingTop: space.sm,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  field: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
  btn: {
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnSolid: {
    backgroundColor: colors.accent,
  },
  btnSoft: {
    backgroundColor: colors.accentSoft,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: fonts.sansSemi,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemi,
    color: colors.faint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: space.sm,
    marginTop: space.md,
  },
  empty: {
    marginTop: space.lg,
    marginBottom: space.md,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.sans,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});
