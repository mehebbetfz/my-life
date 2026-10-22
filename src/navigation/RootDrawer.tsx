import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { AlarmsScreen } from '../screens/AlarmsScreen';
import { AreasScreen } from '../screens/AreasScreen';
import { BooksScreen } from '../screens/BooksScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { GymScreen } from '../screens/GymScreen';
import { HabitsScreen } from '../screens/HabitsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PlannedPurchasesScreen } from '../screens/PlannedPurchasesScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { TodosScreen } from '../screens/TodosScreen';
import { UpdatesScreen } from '../screens/UpdatesScreen';
import { colors, fonts, radii, space } from '../theme';

export type RootDrawerParamList = {
  Today: undefined;
  Todos: undefined;
  Calendar: undefined;
  Expenses: undefined;
  PlannedPurchases: undefined;
  Goals: undefined;
  Habits: undefined;
  Areas: undefined;
  Books: undefined;
  Gym: undefined;
  Alarms: undefined;
  Notifications: undefined;
  Updates: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

type Item = {
  name: keyof RootDrawerParamList;
  title: string;
  hint: string;
  icon: IconName;
  section: 'day' | 'plan' | 'money' | 'system';
};

const ITEMS: Item[] = [
  {
    name: 'Today',
    title: 'Сегодня',
    hint: 'Обзор дня',
    icon: 'sun',
    section: 'day',
  },
  {
    name: 'Todos',
    title: 'Задачи',
    hint: 'Списки и приоритеты',
    icon: 'check-square',
    section: 'day',
  },
  {
    name: 'Calendar',
    title: 'Календарь',
    hint: 'События и сроки',
    icon: 'calendar',
    section: 'day',
  },
  {
    name: 'Goals',
    title: 'Цели',
    hint: 'Долгий горизонт',
    icon: 'target',
    section: 'plan',
  },
  {
    name: 'Habits',
    title: 'Привычки',
    hint: 'Ритуалы и серии',
    icon: 'repeat',
    section: 'plan',
  },
  {
    name: 'Areas',
    title: 'Сферы жизни',
    hint: 'Баланс внимания',
    icon: 'layers',
    section: 'plan',
  },
  {
    name: 'Books',
    title: 'Книги',
    hint: 'Список чтения',
    icon: 'book-open',
    section: 'plan',
  },
  {
    name: 'Gym',
    title: 'Зал',
    hint: 'Тренировки и прогресс',
    icon: 'activity',
    section: 'plan',
  },
  {
    name: 'Expenses',
    title: 'Финансы',
    hint: 'Конверты и распределение',
    icon: 'credit-card',
    section: 'money',
  },
  {
    name: 'PlannedPurchases',
    title: 'Покупки',
    hint: 'Планируемые · откладывать',
    icon: 'shopping-bag',
    section: 'money',
  },
  {
    name: 'Alarms',
    title: 'Будильник',
    hint: 'Звук · дни · snooze',
    icon: 'clock',
    section: 'system',
  },
  {
    name: 'Notifications',
    title: 'Уведомления',
    hint: 'Напоминания',
    icon: 'bell',
    section: 'system',
  },
  {
    name: 'Updates',
    title: 'Обновления',
    hint: 'OTA',
    icon: 'download-cloud',
    section: 'system',
  },
];

const SECTIONS: { id: Item['section']; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'plan', label: 'План' },
  { id: 'money', label: 'Деньги' },
  { id: 'system', label: 'Система' },
];

function DrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index]?.name;

  return (
    <View
      style={[
        styles.drawer,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.brand}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.brandLogo}
          accessibilityLabel="My life"
        />
        <Text style={styles.brandHint}>Инструменты</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {SECTIONS.map((section) => {
          const items = ITEMS.filter((i) => i.section === section.id);
          return (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {items.map((item) => {
                const focused = active === item.name;
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => navigation.navigate(item.name)}
                    style={({ pressed }) => [
                      styles.item,
                      focused && styles.itemActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        focused && styles.itemIconActive,
                      ]}
                    >
                      <Icon
                        name={item.icon}
                        size={18}
                        color={focused ? '#fff' : colors.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.itemTitle,
                          focused && styles.itemTitleActive,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.itemHint}>{item.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function RootDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(4, 5, 6, 0.4)',
        drawerStyle: {
          width: 300,
          backgroundColor: colors.surface,
        },
        swipeEdgeWidth: 48,
      }}
    >
      <Drawer.Screen name="Today" component={TodayScreen} />
      <Drawer.Screen name="Todos" component={TodosScreen} />
      <Drawer.Screen name="Calendar" component={CalendarScreen} />
      <Drawer.Screen name="Expenses" component={ExpensesScreen} />
      <Drawer.Screen
        name="PlannedPurchases"
        component={PlannedPurchasesScreen}
      />
      <Drawer.Screen name="Goals" component={GoalsScreen} />
      <Drawer.Screen name="Habits" component={HabitsScreen} />
      <Drawer.Screen name="Areas" component={AreasScreen} />
      <Drawer.Screen name="Books" component={BooksScreen} />
      <Drawer.Screen name="Gym" component={GymScreen} />
      <Drawer.Screen name="Alarms" component={AlarmsScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Updates" component={UpdatesScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
  },
  brand: {
    marginBottom: space.xl,
    paddingHorizontal: 4,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.inverse,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  brandHint: {
    marginTop: 10,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.muted,
  },
  section: {
    marginBottom: space.lg,
  },
  sectionLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.faint,
    marginBottom: space.sm,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  itemTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    color: colors.ink,
  },
  itemTitleActive: {
    color: colors.accent,
  },
  itemHint: {
    marginTop: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
  },
});
