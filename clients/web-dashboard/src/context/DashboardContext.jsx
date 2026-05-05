import { createContext } from 'react';
import useDashboard from '../hooks/useDashboard';

export const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const dashboard = useDashboard();
  return <DashboardContext.Provider value={dashboard}>{children}</DashboardContext.Provider>;
}
