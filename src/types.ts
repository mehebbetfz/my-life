export type LifeAreaId =
  | 'health'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'growth'
  | 'leisure';

export type LifeArea = {
  id: LifeAreaId;
  title: string;
  color: string;
};

export type Priority = 'low' | 'medium' | 'high';

export type GoalStage = {
  id: string;
  title: string;
  /** 0–100 */
  progress: number;
};

export type Goal = {
  id: string;
  title: string;
  areaId: LifeAreaId;
  targetDate?: string;
  stages: GoalStage[];
  /** все этапы на 100% (или без этапов — вручную) */
  done: boolean;
  createdAt: string;
};

export type HabitMiss = {
  date: string;
  reason: string;
};

export type Habit = {
  id: string;
  title: string;
  areaId: LifeAreaId;
  /** ISO date strings YYYY-MM-DD when completed (legacy / явные дни) */
  completions: string[];
  /** дни нарушения — красные кубики с причиной */
  misses: HabitMiss[];
  /** HH:mm local time for daily reminder */
  remindAt?: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  notes?: string;
  areaId?: LifeAreaId;
  priority: Priority;
  dueDate?: string;
  dueTime?: string;
  /** ISO datetime when local notification should fire */
  remindAt?: string;
  notificationId?: string;
  done: boolean;
  createdAt: string;
};

/** id конверта (строка, в т.ч. пользовательские) */
export type ExpenseCategoryId = string;

/** Feather icon name for envelopes */
export type EnvelopeIconName = string;

export type ExpenseCategory = {
  id: ExpenseCategoryId;
  title: string;
  color: string;
  /** Feather icon, e.g. coffee, home, truck */
  icon: EnvelopeIconName;
};

export type Expense = {
  id: string;
  title: string;
  /** сумма в основной валюте (для конвертов) */
  amount: number;
  /** валюта ввода */
  currency: string;
  /** сумма как ввёл пользователь */
  originalAmount: number;
  categoryId: ExpenseCategoryId;
  date: string;
  note?: string;
  createdAt: string;
};

/** Поступление денег — распределяется по категориям по плану % */
export type Income = {
  id: string;
  title: string;
  /** сумма в основной валюте (для конвертов) */
  amount: number;
  /** валюта ввода */
  currency: string;
  /** сумма как ввёл пользователь */
  originalAmount: number;
  date: string;
  note?: string;
  createdAt: string;
};

/** План распределения: проценты по id конверта, сумма ≈ 100 */
export type BudgetPlan = Record<string, number>;

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  notes?: string;
  areaId?: LifeAreaId;
  /** minutes before start to remind; 0 = at start */
  remindMinutesBefore?: number;
  notificationId?: string;
  createdAt: string;
};

export type NotificationSettings = {
  enabled: boolean;
  /** daily briefing HH:mm */
  dailyBriefingAt: string;
  habitReminders: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
};

/** 0=Пн … 6=Вс */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AlarmSoundId =
  | 'default'
  | 'custom'
  /** @deprecated старые встроенные файлы — только для миграции */
  | 'classic'
  | 'soft'
  | 'bright'
  | 'pulse';

export type Alarm = {
  id: string;
  label: string;
  /** HH:mm */
  time: string;
  /** пустой = каждый день */
  days: Weekday[];
  enabled: boolean;
  soundId: AlarmSoundId;
  /** локальный файл выбранной мелодии (Files / Медиатека) */
  customSoundUri?: string;
  customSoundName?: string;
  vibrate: boolean;
  /** воспроизводить даже в беззвучном (iOS, в приложении) */
  playInSilent: boolean;
  /** нарастающая громкость при звонке */
  gradualVolume: boolean;
  volume: number;
  snoozeMinutes: 5 | 10 | 15 | 20;
  /** id запланированных уведомлений */
  notificationIds: string[];
  createdAt: string;
};

export type Book = {
  id: string;
  title: string;
  author?: string;
  /** прочитано */
  done: boolean;
  doneAt?: string;
  note?: string;
  createdAt: string;
};

export type GymMuscleId =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'other';

export type GymExercise = {
  id: string;
  title: string;
  muscle: GymMuscleId;
  createdAt: string;
};

export type GymSet = {
  reps: number;
  /** кг */
  weight: number;
};

/** Одна запись тренировки по упражнению */
export type GymLog = {
  id: string;
  exerciseId: string;
  date: string;
  sets: GymSet[];
  note?: string;
  createdAt: string;
};

export const GYM_MUSCLES: { id: GymMuscleId; title: string }[] = [
  { id: 'chest', title: 'Грудь' },
  { id: 'back', title: 'Спина' },
  { id: 'legs', title: 'Ноги' },
  { id: 'shoulders', title: 'Плечи' },
  { id: 'arms', title: 'Руки' },
  { id: 'core', title: 'Кор' },
  { id: 'other', title: 'Другое' },
];

export const DEFAULT_GYM_EXERCISES: Omit<GymExercise, 'id' | 'createdAt'>[] = [
  { title: 'Жим лёжа', muscle: 'chest' },
  { title: 'Присед', muscle: 'legs' },
  { title: 'Тяга блока', muscle: 'back' },
  { title: 'Жим стоя', muscle: 'shoulders' },
  { title: 'Подъём на бицепс', muscle: 'arms' },
];

/** Желаемая покупка, на которую можно откладывать */
export type PlannedPurchase = {
  id: string;
  title: string;
  /** целевая цена в основной валюте */
  targetAmount: number;
  currency: string;
  originalTarget: number;
  /** уже отложено в основной валюте */
  savedAmount: number;
  note?: string;
  /** куплено */
  bought: boolean;
  boughtAt?: string;
  createdAt: string;
};

/** Кредит / рассрочка с ежемесячным платежом */
export type Credit = {
  id: string;
  title: string;
  /** платёж в основной валюте */
  paymentAmount: number;
  currency: string;
  originalPayment: number;
  /** день месяца 1–28 */
  dueDay: number;
  /** время напоминания HH:mm */
  remindAt: string;
  /** остаток долга (опционально) */
  remainingDebt?: number;
  note?: string;
  enabled: boolean;
  notificationId?: string;
  notificationIds?: string[];
  createdAt: string;
};

export type AppData = {
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  expenses: Expense[];
  incomes: Income[];
  /** список конвертов (категорий) */
  envelopes: ExpenseCategory[];
  budgetPlan: BudgetPlan;
  plannedPurchases: PlannedPurchase[];
  credits: Credit[];
  books: Book[];
  gymExercises: GymExercise[];
  gymLogs: GymLog[];
  /** основная валюта учёта */
  baseCurrency: string;
  /** курсы: 1 USD = rates[code] */
  fxRates: Record<string, number>;
  fxUpdatedAt?: string;
  events: CalendarEvent[];
  alarms: Alarm[];
  settings: NotificationSettings;
};

export const LIFE_AREAS: LifeArea[] = [
  { id: 'health', title: 'Здоровье', color: '#2D6A4F' },
  { id: 'career', title: 'Карьера', color: '#1D3557' },
  { id: 'finance', title: 'Финансы', color: '#BC6C25' },
  { id: 'relationships', title: 'Отношения', color: '#9B2226' },
  { id: 'growth', title: 'Развитие', color: '#3A5A40' },
  { id: 'leisure', title: 'Отдых', color: '#457B9D' },
];

/** Стартовый набор конвертов */
export const DEFAULT_ENVELOPES: ExpenseCategory[] = [
  { id: 'food', title: 'Еда', color: '#BC6C25', icon: 'coffee' },
  { id: 'transport', title: 'Транспорт', color: '#457B9D', icon: 'truck' },
  { id: 'housing', title: 'Жильё', color: '#1D3557', icon: 'home' },
  { id: 'shopping', title: 'Покупки', color: '#9B2226', icon: 'shopping-bag' },
  { id: 'health', title: 'Здоровье', color: '#2D6A4F', icon: 'heart' },
  { id: 'fun', title: 'Развлечения', color: '#6A4C93', icon: 'film' },
  { id: 'other', title: 'Другое', color: '#6B6B6B', icon: 'grid' },
];

/** Иконки для выбора при создании конверта */
export const ENVELOPE_ICONS = [
  'coffee',
  'truck',
  'home',
  'shopping-bag',
  'heart',
  'film',
  'grid',
  'smartphone',
  'book',
  'gift',
  'briefcase',
  'wifi',
  'zap',
  'umbrella',
  'music',
  'map-pin',
  'credit-card',
  'tool',
  'users',
  'sun',
] as const;

/** @deprecated use DEFAULT_ENVELOPES */
export const EXPENSE_CATEGORIES = DEFAULT_ENVELOPES;

/** Распределение по умолчанию при каждом поступлении */
export const DEFAULT_BUDGET_PLAN: BudgetPlan = {
  food: 25,
  transport: 10,
  housing: 35,
  shopping: 8,
  health: 7,
  fun: 10,
  other: 5,
};

export const ENVELOPE_COLORS = [
  '#BC6C25',
  '#457B9D',
  '#1D3557',
  '#9B2226',
  '#2D6A4F',
  '#6A4C93',
  '#6B6B6B',
  '#EA4B71',
  '#0D9488',
  '#CA8A04',
  '#7C3AED',
  '#2563EB',
];

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyBriefingAt: '09:00',
  habitReminders: true,
  taskReminders: true,
  eventReminders: true,
};

export const ALARM_SOUNDS: {
  id: AlarmSoundId;
  title: string;
  hint: string;
}[] = [
  {
    id: 'default',
    title: 'Системный',
    hint: 'Стандартный звук уведомлений iPhone / Android',
  },
  {
    id: 'custom',
    title: 'Свой трек',
    hint: 'Файл из «Файлы» (mp3, m4a…). Нужна свежая сборка TestFlight',
  },
];

export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
