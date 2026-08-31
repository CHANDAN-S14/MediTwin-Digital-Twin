import { useEffect, useState } from 'react';

/**
 * Respects prefers-reduced-motion.
 *
 * The CSS in index.css handles transitions and keyframes, but a WebGL render loop
 * is invisible to CSS — an auto-rotating camera and a sweeping lidar cone will keep
 * moving no matter what the media query says. Vestibular triggers are a real
 * accessibility concern and a hospital dashboard is exactly the wrong place to
 * ignore one, so the 3D scenes read this and hold still.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => setReduced(event.matches);

    // addEventListener on MediaQueryList is unsupported in Safari before 14.
    if (query.addEventListener) {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  return reduced;
}

/**
 * Whether this browser can actually render the 3D scenes.
 *
 * Checked once, up front, so the twin page can show a static explanation instead of
 * a black rectangle. WebGL is missing more often than you would expect: locked-down
 * hospital desktops, remote sessions, and blocklisted drivers all fail here.
 */
export function useWebGLSupport() {
  const [supported] = useState(() => {
    if (typeof document === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      const context =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');

      if (!context) return false;

      // Release it immediately. Browsers cap live contexts (often at 16) and
      // leaking this one costs a slot the actual scene will want.
      const lose = context.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();

      return true;
    } catch {
      return false;
    }
  });

  return supported;
}
