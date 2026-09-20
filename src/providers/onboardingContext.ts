import { createContext, useContext } from 'react';

export const OnboardingContext = createContext(true);

export const useOnboardingDone = () => useContext(OnboardingContext);
