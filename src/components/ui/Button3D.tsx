"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export type ButtonVariant = "orange" | "blue" | "green" | "purple" | "yellow" | "white" | "red";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface Button3DProps extends Omit<HTMLMotionProps<"button">, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const VARIANT_MAP: Record<ButtonVariant, { bg: string; text: string; shadow: string; border: string }> = {
  orange: {
    bg: "bg-orange-500 hover:bg-orange-400",
    text: "text-white",
    shadow: "shadow-[0_6px_0_0_#c2410c]",
    border: "border-2 border-orange-700",
  },
  blue: {
    bg: "bg-sky-500 hover:bg-sky-400",
    text: "text-white",
    shadow: "shadow-[0_6px_0_0_#0369a1]",
    border: "border-2 border-sky-700",
  },
  green: {
    bg: "bg-emerald-500 hover:bg-emerald-400",
    text: "text-white",
    shadow: "shadow-[0_6px_0_0_#047857]",
    border: "border-2 border-emerald-700",
  },
  purple: {
    bg: "bg-purple-500 hover:bg-purple-400",
    text: "text-white",
    shadow: "shadow-[0_6px_0_0_#6b21a8]",
    border: "border-2 border-purple-700",
  },
  yellow: {
    bg: "bg-amber-400 hover:bg-amber-300",
    text: "text-slate-900",
    shadow: "shadow-[0_6px_0_0_#b45309]",
    border: "border-2 border-amber-600",
  },
  white: {
    bg: "bg-white hover:bg-slate-50",
    text: "text-slate-700",
    shadow: "shadow-[0_6px_0_0_#cbd5e1]",
    border: "border-2 border-slate-300",
  },
  red: {
    bg: "bg-rose-500 hover:bg-rose-400",
    text: "text-white",
    shadow: "shadow-[0_6px_0_0_#be123c]",
    border: "border-2 border-rose-700",
  },
};

const SIZE_MAP: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-xl",
  md: "px-5 py-2.5 text-base rounded-2xl",
  lg: "px-6 py-3.5 text-lg rounded-2xl",
  xl: "px-8 py-4 text-xl rounded-3xl font-extrabold",
};

export const Button3D: React.FC<Button3DProps> = ({
  variant = "orange",
  size = "md",
  children,
  className = "",
  icon,
  disabled,
  ...props
}) => {
  const v = VARIANT_MAP[variant];
  const s = SIZE_MAP[size];

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { y: 4 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-bold select-none cursor-pointer transition-all duration-75 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${v.bg} ${v.text} ${v.shadow} ${v.border} ${s} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
};
