"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Slow-drifting light behind a surface. "vivid" is for the auth panel; "quiet" sits behind app content
 * and stays faint enough never to compete with figures. Purely decorative: aria-hidden, no pointer events.
 */
export function AmbientBackground({ variant = "quiet" }: { variant?: "vivid" | "quiet" }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add({ motion: "(prefers-reduced-motion: no-preference)", fine: "(pointer: fine)" }, (context) => {
      const { motion, fine } = context.conditions as { motion: boolean; fine: boolean };
      if (!motion) return;
      const orbs = gsap.utils.toArray<HTMLElement>(".ambient-orb", element);
      const drift = orbs.map((orb, index) =>
        gsap.to(orb, {
          xPercent: gsap.utils.random(-22, 22),
          yPercent: gsap.utils.random(-18, 18),
          scale: gsap.utils.random(0.9, 1.18),
          rotate: gsap.utils.random(-25, 25),
          duration: gsap.utils.random(16, 26),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: index * -4,
        }),
      );
      const lines = element.querySelector(".ambient-lines");
      const scroll = lines ? gsap.to(lines, { backgroundPositionY: "+=168px", duration: 40, ease: "none", repeat: -1 }) : null;
      let onMove: ((event: PointerEvent) => void) | null = null;
      if (fine && variant === "vivid") {
        const field = element.querySelector(".ambient-field");
        const toX = gsap.quickTo(field, "x", { duration: 1.6, ease: "power3.out" });
        const toY = gsap.quickTo(field, "y", { duration: 1.6, ease: "power3.out" });
        onMove = (event) => {
          toX((event.clientX / window.innerWidth - 0.5) * 36);
          toY((event.clientY / window.innerHeight - 0.5) * 28);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
      }
      const all = [...drift, ...(scroll ? [scroll] : [])];
      const onVisibility = () => all.forEach((tween) => (document.hidden ? tween.pause() : tween.resume()));
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        if (onMove) window.removeEventListener("pointermove", onMove);
      };
    });
    return () => media.revert();
  }, [variant]);

  return (
    <div ref={root} className={`ambient ambient-${variant}`} aria-hidden>
      <div className="ambient-field">
        <span className="ambient-orb orb-a" />
        <span className="ambient-orb orb-b" />
        <span className="ambient-orb orb-c" />
      </div>
      <div className="ambient-lines" />
    </div>
  );
}
