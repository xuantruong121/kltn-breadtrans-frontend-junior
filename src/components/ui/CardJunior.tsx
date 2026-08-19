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
  white: "bg-white border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]",
  "pastel-blue": "bg-sky-50 border-4 border-sky-200 shadow-[0_8px_0_0_#bae6fd]",
  "pastel-green": "bg-emerald-50 border-4 border-emerald-200 shadow-[0_8px_0_0_#a7f3d0]",
  "pastel-orange": "bg-orange-50 border-4 border-orange-200 shadow-[0_8px_0_0_#fed7aa]",
  "pastel-purple": "bg-purple-50 border-4 border-purple-200 shadow-[0_8px_0_0_#e9d5ff]",
  "pastel-yellow": "bg-amber-50 border-4 border-amber-200 shadow-[0_8px_0_0_#fde68a]",
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
