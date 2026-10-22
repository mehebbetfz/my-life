import React from 'react';
import { StyleSheet, View } from 'react-native';
import { envelopeIconFor } from '../lib/finance';
import { Icon, type IconName } from './Icon';

export function CategoryIcon({
  id,
  icon,
  color,
  size = 16,
  box = 28,
}: {
  id?: string;
  icon?: string | null;
  color: string;
  size?: number;
  box?: number;
}) {
  const name = envelopeIconFor(id ?? '', icon) as IconName;
  return (
    <View
      style={[
        styles.box,
        {
          width: box,
          height: box,
          borderRadius: box / 2.5,
          backgroundColor: `${color}22`,
        },
      ]}
    >
      <Icon name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
