import { create } from 'zustand';

interface UserProfile {
  id: string;
  name?: string;
  age: number;
  gender: string;
  weight: number;
  activityLevel: string;
  locationId?: string;
}

interface DailyLogState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  userId: string;
  setUserId: (userId: string) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  targets: any | null;
  setTargets: (targets: any) => void;
  // Hidratación
  currentFluid_ml: number;
  currentFoodWater_ml: number;
  hydrationGoal_ml: number;
  setHydrationData: (fluid: number, food: number, goal: number) => void;
}

export const useDailyLogStore = create<DailyLogState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
  userId: 'default-user',
  setUserId: (userId) => set({ userId }),
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),
  targets: null,
  setTargets: (targets) => set({ targets }),
  currentFluid_ml: 0,
  currentFoodWater_ml: 0,
  hydrationGoal_ml: 2000,
  setHydrationData: (fluid, food, goal) => set({
    currentFluid_ml: fluid,
    currentFoodWater_ml: food,
    hydrationGoal_ml: goal
  }),
}));
