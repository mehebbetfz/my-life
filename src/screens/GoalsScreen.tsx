import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import {
  Chip,
  EmptyHint,
  Field,
  PrimaryButton,
  Row,
  Screen,
  Subtitle,
  Title,
} from '../components/ui';
import { useData } from '../context/DataContext';
import { colors } from '../theme';
import { LIFE_AREAS, type LifeAreaId } from '../types';

export function GoalsScreen() {
  const { data, addGoal, toggleGoal, removeGoal } = useData();
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState<LifeAreaId>('growth');

  const onAdd = () => {
    if (!title.trim()) return;
    addGoal(title, areaId);
    setTitle('');
  };

  return (
    <Screen>
      <Title>Цели</Title>
      <Subtitle>Долгосрочные ориентиры по сферам жизни</Subtitle>

      <View style={styles.addRow}>
        <Field
          style={styles.addField}
          placeholder="Новая цель"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        <PrimaryButton label="+" onPress={onAdd} />
      </View>

      <View style={styles.chips}>
        {LIFE_AREAS.map((a) => (
          <Chip
            key={a.id}
            label={a.title}
            color={a.color}
            selected={areaId === a.id}
            onPress={() => setAreaId(a.id)}
          />
        ))}
      </View>

      <FlatList
        data={data.goals}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyHint>
            Сформулируй цель в одной фразе — например, «пробежать 10 км» или
            «закрыть долг».
          </EmptyHint>
        }
        renderItem={({ item }) => {
          const area = LIFE_AREAS.find((a) => a.id === item.areaId);
          return (
            <Row
              onPress={() => toggleGoal(item.id)}
              onLongPress={() =>
                Alert.alert('Удалить цель?', item.title, [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => removeGoal(item.id),
                  },
                ])
              }
            >
              <View style={styles.rowInner}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: area?.color ?? colors.accent },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.itemTitle,
                      item.done && styles.itemDone,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.meta}>{area?.title}</Text>
                </View>
              </View>
            </Row>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  addField: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemTitle: { fontSize: 16, color: colors.ink, fontWeight: '500' },
  itemDone: { textDecorationLine: 'line-through', color: colors.muted },
  meta: { fontSize: 12, marginTop: 2, color: colors.muted },
});
