"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface CardJuniorProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: "white" | "pastel-blue" | "pastel-green" | "pastel-orange" | "pastel-purple" | "pastel-yellow";
  isHoverable?: boolean;
}

const VARIANT_MAP = {
  white: "bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 shadow-[0_8px_0_0_#e2e8f0] dark:shadow-[0_8px_0_0_#1e293b]",
  "pastel-blue": "bg-sky-50 dark:bg-sky-950/40 border-4 border-sky-200 dark:border-sky-800 shadow-[0_8px_0_0_#bae6fd] dark:shadow-[0_8px_0_0_#075985]",
  "pastel-green": "bg-emerald-50 dark:bg-emerald-950/40 border-4 border-emerald-200 dark:border-emerald-800 shadow-[0_8px_0_0_#a7f3d0] dark:shadow-[0_8px_0_0_#065f46]",
  "pastel-orange": "bg-orange-50 dark:bg-orange-950/40 border-4 border-orange-200 dark:border-orange-800 shadow-[0_8px_0_0_#fed7aa] dark:shadow-[0_8px_0_0_#9a3412]",
  "pastel-purple": "bg-purple-50 dark:bg-purple-950/40 border-4 border-purple-200 dark:border-purple-800 shadow-[0_8px_0_0_#e9d5ff] dark:shadow-[0_8px_0_0_#6b21a8]",
  "pastel-yellow": "bg-amber-50 dark:bg-amber-950/40 border-4 border-amber-200 dark:border-amber-800 shadow-[0_8px_0_0_#fde68a] dark:shadow-[0_8px_0_0_#92400e]",
};

export const CardJunior: React.FC<CardJuniorProps> = ({
  children,
  className = "",
  variant = "white",
  isHoverable = false,
  ...props
}) => {
  return (
    <motion.div
      whileHover={isHoverable ? { y: -4, transition: { duration: 0.15 } } : {}}
      className={`rounded-[2rem] p-6 transition-all ${VARIANT_MAP[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
