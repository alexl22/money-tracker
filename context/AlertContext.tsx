import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

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

interface AlertActions {
  showAlert: (
    title: string,
    message: string,
    type?: AlertType,
    onConfirm?: () => void,
    showCancel?: boolean,
    disableBlur?: boolean
  ) => void;
  hideAlert: () => void;
}

const AlertStateContext = createContext<AlertState | undefined>(undefined);
const AlertActionsContext = createContext<AlertActions | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    type: 'alert',
    showCancel: false,
    disableBlur: false,
  });

  const showAlert = useCallback((
    title: string,
    message: string,
    type: AlertType = 'alert',
    onConfirm?: () => void,
    showCancel: boolean = false,
    disableBlur: boolean = false
  ) => {
    setAlertState({ visible: true, title, message, type, onConfirm, showCancel, disableBlur });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const actions = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);

  return (
    <AlertActionsContext.Provider value={actions}>
      <AlertStateContext.Provider value={alertState}>
        {children}
      </AlertStateContext.Provider>
    </AlertActionsContext.Provider>
  );
};

export const useAlert = () => {
  const actions = useContext(AlertActionsContext);
  if (!actions) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return actions;
};

export const useAlertState = () => {
  const state = useContext(AlertStateContext);
  if (!state) {
    throw new Error('useAlertState must be used within an AlertProvider');
  }
  return state;
};
