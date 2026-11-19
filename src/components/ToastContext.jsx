import { createContext, useContext, useState, useCallback } from 'react';
import Toast from './Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(({
        title,
        message = '',
        type = 'info',
        duration = 3000,
    }) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        setToasts((previous) => [
            ...previous,
            { id, title, message, type },
        ]);

        setTimeout(() => {
            setToasts((previous) => previous.filter((toast) => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((previous) =>
            previous.map((toast) =>
                toast.id === id ? { ...toast, exiting: true } : toast
            )
        );

        setTimeout(() => {
            setToasts((previous) => previous.filter((toast) => toast.id !== id));
        }, 300);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            <div className="fixed right-5 top-5 z-100 flex w-[calc(100%-2.5rem)] flex-col gap-3">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        toast={toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider.');
    }

    return context;
};
