/**
 * useThinkingAnimation - Custom hook for cycling thinking messages
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export default function useThinkingAnimation(thinkingMessages) {
  const [thinkingMessage, setThinkingMessage] = useState('');
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    const msgs = thinkingMessages;
    let idx = 0;
    setThinkingMessage(msgs[0]);
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setThinkingMessage(msgs[idx]);
    }, 2500);
  }, [thinkingMessages]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { thinkingMessage, start, stop };
}
