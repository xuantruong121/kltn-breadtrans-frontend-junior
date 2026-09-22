"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export interface BackButtonProps {
  label?: string;
  href?: string;
  className?: string;
  variant?: "default" | "subtle" | "ghost";
  onClick?: (e: React.MouseEvent) => void;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label = "Quay lại",
  href,
  className = "",
  variant = "default",
  onClick,
}) => {
  const router = useRouter();

  const baseStyles =
    "group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all cursor-pointer select-none";

  const variantStyles = {
    default:
      "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 hover:shadow-md active:translate-y-0.5",
    subtle:
      "bg-slate-100 dark:bg-slate-800/60 border-2 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100",
    ghost:
      "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800",
  };

  const content = (
    <motion.div
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.96 }}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 group-hover:text-amber-600 dark:group-hover:text-amber-400 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors shadow-xs">
        <ArrowLeft
          size={16}
          strokeWidth={2.5}
          className="group-hover:-translate-x-0.5 transition-transform"
        />
      </div>
      <span className="tracking-wide">{label}</span>
    </motion.div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-block"
      >
        {content}
      </button>
    );
  }

  if (href) {
    return <Link href={href} className="inline-block">{content}</Link>;
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-block"
    >
      {content}
    </button>
  );
};
