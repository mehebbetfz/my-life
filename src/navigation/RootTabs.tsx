import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AreasScreen } from '../screens/AreasScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { HabitsScreen } from '../screens/HabitsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { colors } from '../theme';

export type RootTabParamList = {
  Today: undefined;
  Goals: undefined;
  Habits: undefined;
  Areas: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: focused ? '700' : '500', color: focused ? colors.accent : colors.muted }}>
      {label}
    </Text>
  );
}

export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          title: 'Сегодня',
          tabBarIcon: ({ focused }) => <TabIcon label="●" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          title: 'Цели',
          tabBarIcon: ({ focused }) => <TabIcon label="◆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          title: 'Привычки',
          tabBarIcon: ({ focused }) => <TabIcon label="○" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Areas"
        component={AreasScreen}
        options={{
          title: 'Сферы',
          tabBarIcon: ({ focused }) => <TabIcon label="▣" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
