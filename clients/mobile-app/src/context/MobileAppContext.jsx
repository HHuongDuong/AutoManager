import React, { createContext, useContext } from 'react';
import useMobileAppState from '../hooks/useMobileApp';

const MobileAppContext = createContext(null);

export const MobileAppProvider = ({ children }) => {
  const value = useMobileAppState();
  return (
    <MobileAppContext.Provider value={value}>
      {children}
    </MobileAppContext.Provider>
  );
};

export const useMobileApp = () => {
  const ctx = useContext(MobileAppContext);
  if (!ctx) throw new Error('useMobileApp must be used within MobileAppProvider');
  return ctx;
};
