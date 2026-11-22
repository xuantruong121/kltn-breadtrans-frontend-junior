"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FAQ } from "@/lib/landing/faq";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

/**
 * FAQ (spec 6.4.5, blueprint "Accordion of filled tiles"): a sticky heading
 * on the left, filled tiles on the right. Each tile is a <details> sharing
 * name="faq", so the browser keeps one open at a time and the keyboard works
 * without script. A closed tile is a loaf (72px tall, 36px corners); the open
 * one lights up in --lit, the colour of a lit cut, since orange stays on the
 * button and the loaf (spec 6.2).
 */
export function FaqTiles({ actions }: { actions: LandingActions }) {
  void actions; // the FAQ only links to /help
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-faq-title" className="landing-container">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
        {/* top-32: 128px clears the 80px sticky AppHeader with room to spare. */}
        <motion.h2
          id="landing-faq-title"
          className="landing-display landing-section-title lg:sticky lg:top-32 lg:col-span-4 lg:self-start"
          {...revealProps(reduced, 0)}
        >
          Câu hỏi thường gặp
        </motion.h2>

        <div className="mt-8 lg:col-span-8 lg:mt-0">
          <ul className="flex flex-col gap-1.5 lg:gap-2">
            {FAQ.map((item, index) => (
              <motion.li key={item.q} {...revealProps(reduced, 1 + Math.min(index, 2))}>
                <details
                  name="faq"
                  className="group rounded-[36px] bg-(--surface) text-(--ink) transition-colors duration-200 open:bg-(--lit) open:text-(--on-lit)"
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 rounded-[36px] px-5 py-4 transition-colors duration-200 hover:bg-(--surface-2) group-open:hover:bg-transparent lg:min-h-[72px] lg:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="text-(length:--type-body) font-medium leading-snug lg:text-(length:--type-lead)">
                      {item.q}
                    </span>
                    {/* Plus from two 3px bars 16px long; the upright bar turns flat, a minus. */}
                    <span aria-hidden="true" className="relative size-4 shrink-0">
                      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-current" />
                      <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-current transition-[rotate] duration-300 ease-out group-open:rotate-90 motion-reduce:transition-none" />
                    </span>
                  </summary>
                  <div className="px-5 pb-6 lg:px-6">
                    <p className="landing-body max-w-[52ch]">{item.a}</p>
                  </div>
                </details>
              </motion.li>
            ))}
          </ul>
          <motion.p className="mt-6" {...revealProps(reduced, 3)}>
            <Link href="/help" className="landing-link">
              Xem các câu hỏi khác ở trang FAQ
            </Link>
          </motion.p>
        </div>
      </div>
    </section>
  );
}
