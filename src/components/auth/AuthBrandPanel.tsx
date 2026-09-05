"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Croissant,
  GraduationCap,
  School,
  Sparkles,
} from "lucide-react";

export function AuthBrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-junior-blue p-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
      <div className="absolute left-12 top-12 z-20 flex items-center gap-5">
        <div className="rotate-[-8deg] rounded-[1.5rem] border-2 border-white/50 bg-white p-4 text-junior-orange shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-transform hover:rotate-0">
          <Croissant size={52} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="text-5xl font-extrabold leading-none tracking-tight text-white drop-shadow-sm">
            Bread<span className="text-orange-300">Trans</span>
          </span>
          <span className="mt-2 text-lg font-bold uppercase tracking-widest text-sky-200">
            Junior
          </span>
        </div>
      </div>

      <motion.div
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 80, ease: "linear" }}
        className="absolute -left-32 -top-32 text-sky-400 opacity-20 motion-reduce:animate-none"
      >
        <Sparkles size={600} strokeWidth={1} />
      </motion.div>

      <div className="relative z-10 w-full max-w-lg">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: -2 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="mb-8 flex items-center gap-6 rounded-[3rem] border-8 border-sky-300 bg-white p-8 shadow-2xl motion-reduce:transform-none"
        >
          <div className="rounded-full bg-orange-100 p-6 text-junior-orange">
            <School size={64} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Trường học vui</h2>
            <p className="text-xl font-medium text-slate-500">Nơi phép màu bắt đầu</p>
          </div>
        </motion.div>

        <div className="ml-12 flex gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.6, delay: 0.4 }}
            className="flex-1 rounded-[2rem] border-4 border-green-400 bg-junior-green p-6 text-white shadow-xl motion-reduce:transform-none"
          >
            <BookOpen size={48} className="mb-4" aria-hidden="true" />
            <h3 className="text-2xl font-bold">Từ vựng</h3>
          </motion.div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotate: 6 }}
            transition={{ type: "spring", bounce: 0.6, delay: 0.5 }}
            className="mt-12 flex-1 rounded-[2rem] border-4 border-purple-400 bg-purple-500 p-6 text-white shadow-xl motion-reduce:transform-none"
          >
            <GraduationCap size={48} className="mb-4" aria-hidden="true" />
            <h3 className="text-2xl font-bold">Luyện nói</h3>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
