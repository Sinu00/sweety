import { createContext, useContext } from 'react';

// Shared app state: the signed-in user, the add/edit reading sheet, and a
// counter that pages watch so they reload after a reading changes.
export const AppContext = createContext({
  user: null,
  openReading: () => {},
  dataVersion: 0,
});

export const useApp = () => useContext(AppContext);
