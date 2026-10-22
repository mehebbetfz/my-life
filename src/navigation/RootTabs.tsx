import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { TodosScreen } from '../screens/TodosScreen';
import { colors, fonts } from '../theme';

export type RootTabParamList = {
  Today: undefined;
  Todos: undefined;
  Calendar: undefined;
  Expenses: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TABS: {
  name: keyof RootTabParamList;
  title: string;
  icon: IconName;
  component: React.ComponentType;
}[] = [
  { name: 'Today', title: 'Сегодня', icon: 'sun', component: TodayScreen },
  { name: 'Todos', title: 'Задачи', icon: 'check-square', component: TodosScreen },
  { name: 'Calendar', title: 'Календарь', icon: 'calendar', component: CalendarScreen },
  { name: 'Expenses', title: 'Расходы', icon: 'credit-card', component: ExpensesScreen },
  { name: 'More', title: 'Ещё', icon: 'menu', component: MoreScreen },
];

function TabGlyph({
  name,
  focused,
}: {
  name: IconName;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Icon
        name={name}
        size={20}
        color={focused ? colors.accent : colors.faint}
      />
      {focused ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
    </View>
  );
}

export function RootTabs() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.bar,
          { height: 56 + bottom, paddingBottom: bottom },
        ],
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabGlyph name={tab.icon} focused={focused} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.sansMedium,
    marginTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  dotSpacer: {
    width: 4,
    height: 4,
  },
});
