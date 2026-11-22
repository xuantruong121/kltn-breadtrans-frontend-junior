"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { QuickLoginModal } from "@/components/auth/QuickLoginModal";
import { QuickRegisterModal } from "@/components/auth/QuickRegisterModal";
import { LandingHero } from "./LandingHero";
import { SkillsShowcase } from "./SkillsShowcase";
import { HabitTiles } from "./HabitTiles";
import { PathFields } from "./PathFields";
import { PlanPicker } from "./PlanPicker";
import { FaqTiles } from "./FaqTiles";
import { ActionTile } from "./ActionTile";
import { LoafMark } from "./LoafMark";
import type { LandingActions } from "./types";
import "./landing.css";

/** Without JavaScript nothing animates: show every revealed element as it ends. */
const NO_SCRIPT_REVEAL = ".landing [data-reveal]{opacity:1!important;transform:none!important}";

/**
 * The public landing `/`. It keeps the auth logic and the three modals of the
 * old page unchanged and hands the sections what they may do (LandingActions).
 * `className` carries the font variables from page.tsx (Fraunces, Be Vietnam Pro).
 */
export function LandingPage({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { user } = useAuthStore();

  // Auth Gate state
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [targetLabel, setTargetLabel] = useState("bài học");
  const [targetRoute, setTargetRoute] = useState("/dashboard");

  // Quick modals state
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);

  // Protected Action Handler
  const handleProtectedAction = (label: string, route: string) => {
    if (user) {
      router.push(route);
    } else {
      setTargetLabel(label);
      setTargetRoute(route);
      setAuthGateOpen(true);
    }
  };

  const openDirectLogin = (label = "bài học", route = "/dashboard") => {
    setTargetLabel(label);
    setTargetRoute(route);
    setQuickLoginOpen(true);
  };

  const openDirectRegister = (label = "tài khoản học viên", route = "/dashboard") => {
    setTargetLabel(label);
    setTargetRoute(route);
    setQuickRegisterOpen(true);
  };

  // The old page showed a /dashboard link instead of these buttons to a
  // signed-in learner; the sections get one action that does both.
  const actions: LandingActions = {
    register: () => (user ? router.push("/dashboard") : openDirectRegister("tài khoản học viên", "/dashboard")),
    login: () => (user ? router.push("/dashboard") : openDirectLogin("bài học", "/dashboard")),
    protectedGo: handleProtectedAction,
  };

  return (
    <>
      <div className={`landing min-h-full antialiased ${className}`}>
        <noscript>
          <style>{NO_SCRIPT_REVEAL}</style>
        </noscript>
        <div className="landing-stack">
          <LandingHero actions={actions} />
          <SkillsShowcase actions={actions} />
          <HabitTiles actions={actions} />
          <PathFields actions={actions} />
          <PlanPicker actions={actions} />
          <FaqTiles actions={actions} />
          <ActionTile actions={actions} />
          <LoafMark actions={actions} />
        </div>
      </div>

      {/* The modals stay outside .landing, so they keep the app's tokens and font. */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onOpenLogin={() => {
          setAuthGateOpen(false);
          setQuickLoginOpen(true);
        }}
        onOpenRegister={() => {
          setAuthGateOpen(false);
          setQuickRegisterOpen(true);
        }}
      />

      <QuickLoginModal
        isOpen={quickLoginOpen}
        onClose={() => setQuickLoginOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onSwitchToRegister={() => {
          setQuickLoginOpen(false);
          setQuickRegisterOpen(true);
        }}
      />

      <QuickRegisterModal
        isOpen={quickRegisterOpen}
        onClose={() => setQuickRegisterOpen(false)}
        targetLabel={targetLabel}
        targetRoute={targetRoute}
        onSwitchToLogin={() => {
          setQuickRegisterOpen(false);
          setQuickLoginOpen(true);
        }}
      />
    </>
  );
}
