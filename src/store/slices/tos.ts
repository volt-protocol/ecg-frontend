import { StateCreator } from 'zustand';

export interface TosSlice {
  termsAccepted: boolean;
  setTermsAccepted: (value: boolean) => void;
}

export const createTosSlice: StateCreator<TosSlice> = (set, get) => ({
  termsAccepted: false,
  setTermsAccepted: () => {
    set({ termsAccepted: true });
  },
});
