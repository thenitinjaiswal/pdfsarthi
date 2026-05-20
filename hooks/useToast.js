import { useApp } from '@/context/AppContext';
import { useCallback } from 'react';

/**
 * Convenience hook for triggering toasts.
 * Usage: const toast = useToast(); toast.success('Done!');
 */
export function useToast() {
  const { addToast } = useApp();

  return {
    success: useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]),
    error:   useCallback((msg, duration) => addToast(msg, 'error',   duration), [addToast]),
    info:    useCallback((msg, duration) => addToast(msg, 'info',    duration), [addToast]),
    warning: useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]),
  };
}
