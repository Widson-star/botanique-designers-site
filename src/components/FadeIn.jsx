import { useEffect, useRef, useState } from "react";

/**
 * FadeIn – wraps children with a scroll-triggered reveal animation.
 *
 * Props:
 *   delay     {number}  ms delay before transition starts (for stagger)
 *   direction {"up"|"left"|"right"|"none"}  initial offset direction
 *   className {string}  extra classes on the wrapper div
 *   threshold {number}  0–1, how much of the element must be visible (default 0.12)
 */
export default function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
  threshold = 0.12,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If already in viewport on mount, reveal immediately (handles direct page loads on mobile)
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const initial = {
    up: "opacity-0 translate-y-8",
    left: "opacity-0 translate-x-8",
    right: "opacity-0 -translate-x-8",
    none: "opacity-0",
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-x-0 translate-y-0" : initial[direction]
      } ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
