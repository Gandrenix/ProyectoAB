import { create } from 'zustand';

interface UserProfile {
  id: string;
  name?: string;
  age: number;
  gender: string;
  weight: number;
  activityLevel: string;
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
}));
