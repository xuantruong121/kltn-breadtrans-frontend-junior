"use client";

import { notFound, useParams } from "next/navigation";

import { GateRunner } from "@/components/learning-path/GateRunner";
import { parseGateSkill } from "@/lib/learning-path/levelLock";

export default function GatePage() {
  const params = useParams<{ skill: string }>();
  const skill = parseGateSkill(params.skill);
  if (!skill) notFound();
  return <GateRunner skill={skill} />;
}
