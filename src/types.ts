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

export type Goal = {
  id: string;
  title: string;
  areaId: LifeAreaId;
  targetDate?: string;
  done: boolean;
  createdAt: string;
};

export type Habit = {
  id: string;
  title: string;
  areaId: LifeAreaId;
  /** ISO date strings YYYY-MM-DD when completed */
  completions: string[];
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  areaId?: LifeAreaId;
  dueDate?: string;
  done: boolean;
  createdAt: string;
};

export type AppData = {
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
};

export const LIFE_AREAS: LifeArea[] = [
  { id: 'health', title: 'Здоровье', color: '#2D6A4F' },
  { id: 'career', title: 'Карьера', color: '#1D3557' },
  { id: 'finance', title: 'Финансы', color: '#BC6C25' },
  { id: 'relationships', title: 'Отношения', color: '#9B2226' },
  { id: 'growth', title: 'Развитие', color: '#3A5A40' },
  { id: 'leisure', title: 'Отдых', color: '#457B9D' },
];
