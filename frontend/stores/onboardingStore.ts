'use client';

import { create } from 'zustand';

const STORAGE_KEY = 'intellidocs_onboarding_completed';

interface OnboardingState {
  tourActive: boolean;
  tourStep: number;
  hasCompleted: boolean;

  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  resetTour: () => void;
  initFromStorage: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  tourActive: false,
  tourStep: 0,
  hasCompleted: false,

  initFromStorage: () => {
    const completed = localStorage.getItem(STORAGE_KEY) === 'true';
    set({ hasCompleted: completed });
    if (!completed) {
      set({ tourActive: true, tourStep: 0 });
    }
  },

  startTour: () => set({ tourActive: true, tourStep: 0 }),

  nextStep: () => {
    const { tourStep } = get();
    if (tourStep >= 4) {
      get().endTour();
    } else {
      set({ tourStep: tourStep + 1 });
    }
  },

  prevStep: () => {
    const { tourStep } = get();
    if (tourStep > 0) set({ tourStep: tourStep - 1 });
  },

  endTour: () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    set({ tourActive: false, tourStep: 0, hasCompleted: true });
  },

  resetTour: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ hasCompleted: false, tourActive: true, tourStep: 0 });
  },
}));
