import { useEffect, useState } from "react";

/** Tailwind `md` breakpoint (px). Below this we treat the viewport as mobile. */
export const MOBILE_BREAKPOINT = 768;

function readSize() {
  if (typeof window === "undefined") return { width: 1280, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Reactive viewport size (updates on resize / orientation change). */
export function useWindowSize() {
  const [size, setSize] = useState(readSize);

  useEffect(() => {
    const onResize = () => setSize(readSize());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return size;
}

/** `true` when the viewport is narrower than the `md` breakpoint (768px). */
export function useIsMobile() {
  const { width } = useWindowSize();
  return width < MOBILE_BREAKPOINT;
}
