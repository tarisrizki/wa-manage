import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error';
}

interface ConfirmOptions {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions & { id: number } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const showToast = (options: ToastOptions) => {
    setToast({ ...options, id: Date.now() });
    setTimeout(() => {
      setToast((current) => (current?.id === options.id ? null : current));
    }, 3000);
  };

  const showConfirm = (options: ConfirmOptions) => {
    setConfirm(options);
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg glass-panel bg-wa-panel border border-wa-border text-white min-w-[250px]"
          >
            {toast.type === 'error' ? (
              <XCircle className="text-wa-danger" size={20} />
            ) : (
              <CheckCircle className="text-wa-teal" size={20} />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Dialog Overlay */}
      <AnimatePresence>
        {confirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-wa-panel border border-wa-border rounded-xl shadow-2xl overflow-hidden w-full max-w-sm"
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-wa-danger/10 flex items-center justify-center text-wa-danger shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {confirm.title || 'Konfirmasi'}
                  </h3>
                </div>
                <p className="text-wa-textMuted text-sm pl-[52px]">
                  {confirm.message}
                </p>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 bg-wa-bg/50 border-t border-wa-border">
                <button
                  onClick={() => {
                    confirm.onCancel?.();
                    setConfirm(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-wa-textDark hover:bg-wa-hover transition-colors focus:outline-none"
                >
                  {confirm.cancelText || 'Batal'}
                </button>
                <button
                  onClick={() => {
                    confirm.onConfirm();
                    setConfirm(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-wa-danger hover:bg-red-600 text-white shadow-sm transition-colors focus:outline-none"
                >
                  {confirm.confirmText || 'Lanjutkan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
