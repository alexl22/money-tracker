import React, { createContext, useContext, ReactNode } from 'react';
import { useSharedValue } from 'react-native-reanimated';

interface TabBarContextType {
  tabBarOffset: any; // Using any for simplicity in typing common Reanimated SharedValue
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export const TabBarProvider = ({ children }: { children: ReactNode }) => {
  const tabBarOffset = useSharedValue(0);

  return (
    <TabBarContext.Provider value={{ tabBarOffset }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => {
  const context = useContext(TabBarContext);
  if (!context) {
    throw new Error('useTabBar must be used within a TabBarProvider');
  }
  return context;
};
