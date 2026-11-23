"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { planService } from "@/lib/api/services/plan.service";
import { formatVnd, planViews, type PlanCode, type PlanView } from "@/lib/landing/plans";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

/** "/ 30 ngày" beside the price; Free has no term. */
const periodOf = (plan: PlanView) => (plan.days ? `/ ${plan.days} ngày` : "không thời hạn");

/**
 * One plan's price, what it includes and its way on to /plans. The figure
 * sits at the top, so it stays put while the stage changes plan.
 */
function PlanStage({ plan, className = "" }: { plan: PlanView; className?: string }) {
  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="landing-display text-(length:--type-hero) leading-[0.95] tabular-nums">
          {formatVnd(plan.priceVnd)}
        </span>
        <span className="landing-body landing-muted">{periodOf(plan)}</span>
      </p>
      <p className="landing-body mt-6 max-w-[52ch]">{plan.summary}</p>
      {plan.moreTerms ? (
        <Link href="/plans" className="landing-link mt-3">
          Xem gói 90 và 180 ngày
        </Link>
      ) : null}
      <div className="mt-6">
        <Link href="/plans" className="landing-button w-full sm:w-auto">
          Xem gói {plan.name}
        </Link>
      </div>
    </div>
  );
}

/**
 * Plans (spec 6.4.4, blueprint "Plan names, one live figure"): the names are
 * toggle buttons on the left, the chosen plan's stage on the right; under lg
 * the stage follows the list. Prices come from the public catalog
 * and show the fallback at once, so nothing waits for the API.
 *
 * Selection follows click, Enter and Space, not focus: with focus-follow a
 * keyboard user tabbing from Free to the stage would pass Plus and Pro and
 * always arrive at Pro's stage.
 */
export function PlanPicker({ actions }: { actions: LandingActions }) {
  void actions; // the plan buttons go to /plans, which handles signing in itself
  const reduced = Boolean(useReducedMotion());
  const [selected, setSelected] = useState<PlanCode>("PLUS");
  const { data } = useQuery({
    queryKey: ["landing-plan-catalog"],
    queryFn: planService.getPublicCatalog,
    staleTime: 300_000,
  });
  const plans = planViews(data ?? null);

  return (
    <section aria-labelledby="landing-plans-title" className="landing-container">
      <motion.h2
        id="landing-plans-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        Gói học và giá
      </motion.h2>

      <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-12 lg:gap-x-8">
        <ul className="lg:col-span-6">
          {plans.map((plan, index) => {
            const isSelected = plan.code === selected;
            return (
              <motion.li key={plan.code} {...revealProps(reduced, index + 1)}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(plan.code)}
                  className={`landing-display inline-flex min-h-11 cursor-pointer items-center gap-[0.22em] text-(length:--type-hero) leading-[1.05] transition-[color,scale] duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none ${
                    isSelected ? "text-(--ink)" : "text-(--muted) hover:text-(--ink)"
                  }`}
                >
                  {/* The cut bullet marks the chosen name; the others keep its room, so no name shifts. */}
                  <span
                    aria-hidden="true"
                    className={`landing-cut-bullet transition-opacity duration-200 ${isSelected ? "opacity-100" : "opacity-0"}`}
                  />
                  {plan.name}
                </button>
              </motion.li>
            );
          })}
        </ul>

        {/* The stage: all three stages share one cell, so the figure never moves and
            the section never changes height; changing plan crossfades in 200ms.
            Under lg it sits below the three names, never between two of them. */}
        <motion.div className="mt-8 lg:col-span-5 lg:col-start-8 lg:mt-0" {...revealProps(reduced, 2)}>
          <div className="grid">
            {plans.map((plan) => {
              const isSelected = plan.code === selected;
              return (
                <PlanStage
                  key={plan.code}
                  plan={plan}
                  className={`[grid-area:1/1] transition-[opacity,visibility] duration-200 ease-out ${
                    isSelected ? "visible opacity-100" : "invisible opacity-0"
                  }`}
                />
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
