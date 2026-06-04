import React, { useMemo } from 'react';

/**
 * Particles - Floating particle background effect.
 * Automatically reduces count on mobile for performance.
 * Respects prefers-reduced-motion.
 */
const Particles = React.memo(({ count = 30 }) => {
  const particles = useMemo(() => {
    // Reduce particle count on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const actualCount = isMobile ? Math.min(count, 10) : count;

    return Array.from({ length: actualCount }, (_, i) => {
      const size = Math.random() * 4 + 1;
      const left = Math.random() * 100;
      const duration = Math.random() * 15 + 10;
      const delay = Math.random() * 10;
      const hue = Math.random() > 0.5 ? '260' : '330'; // purple or pink
      const opacity = Math.random() * 0.4 + 0.1;

      return (
        <div
          key={i}
          className="particle"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            background: `hsla(${hue}, 80%, 65%, ${opacity})`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    });
  }, [count]);

  return <div className="particles-container">{particles}</div>;
});

export default Particles;
