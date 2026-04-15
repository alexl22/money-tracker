import React, { createContext, useContext, useState, ReactNode } from 'react';

type AlertType = 'success' | 'alert' | 'info';

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm?: () => void;
  showCancel?: boolean;
  disableBlur?: boolean;
}

interface AlertContextProps {
  showAlert: (
    title: string, 
    message: string, 
    type?: AlertType, 
    onConfirm?: () => void,
    showCancel?: boolean,
    disableBlur?: boolean
  ) => void;
  hideAlert: () => void;
  alertState: AlertState;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    type: 'alert',
    showCancel: false,
    disableBlur: false,
  });

  const showAlert = (
    title: string, 
    message: string, 
    type: AlertType = 'alert', 
    onConfirm?: () => void,
    showCancel: boolean = false,
    disableBlur: boolean = false
  ) => {
    setAlertState({ visible: true, title, message, type, onConfirm, showCancel, disableBlur });
  };

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alertState }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
