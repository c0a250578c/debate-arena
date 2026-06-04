import { useCallback } from 'react';

/**
 * useKeyboardSelect - Custom hook to standardize keyboard accessibility
 * for custom interactive elements (like divs acting as buttons).
 * Triggers callback on Enter or Space.
 */
export default function useKeyboardSelect(onSelect) {
  return useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }, [onSelect]);
}
