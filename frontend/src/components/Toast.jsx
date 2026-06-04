import { useEffect } from 'react';
import { IconCross } from './Icons';

/**
 * Toast - Notification toast (replaces alert())
 */
export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="toast" role="alert">
      <span className="toast__message">{message}</span>
      <button className="toast__close" onClick={onClose} aria-label="閉じる">
        <IconCross size={14} />
      </button>
    </div>
  );
}
