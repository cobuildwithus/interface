"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const spring = useSpring(value, { stiffness: 75, damping: 15 });
  const display = useTransform(spring, (v) => format(v));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
