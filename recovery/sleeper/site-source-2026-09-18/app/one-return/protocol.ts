import {
  PRIMARY_GATE_BY_TOOL,
  type GateName,
  type GateProof,
  type ToolName,
  type WorldLaw,
} from "./world-law.ts";

export type ToolGateDecision =
  | { status: "none" }
  | { status: "blocked"; line: string }
  | { status: "open"; note: string };

const PRIMARY_NOTES: Readonly<Record<ToolName, string>> = {
  conch: "The nearby signal was revealed and sourced.",
  keris: "A wall changed the next possible route.",
  w8: "The marked coordinate was left, held, and recovered.",
  spiral: "The city survived a change of representation.",
};

export function evaluateToolGate(
  law: WorldLaw,
  proofs: readonly GateProof[],
  gate: GateName,
  tool: ToolName,
  primaryEffectSatisfied: boolean,
): ToolGateDecision {
  const primary = PRIMARY_GATE_BY_TOOL[tool];
  if (gate === primary) {
    return primaryEffectSatisfied ? { status: "open", note: PRIMARY_NOTES[tool] } : { status: "none" };
  }
  if (gate !== "TRANSFER" || tool !== law.transferTool) return { status: "none" };
  if (!proofs.some((proof) => proof.gate === primary)) {
    return { status: "blocked", line: `TRANSFER LOCKED: PROVE ${primary} FIRST.` };
  }
  return { status: "open", note: `${tool.toUpperCase()} transferred into a second Gate law.` };
}

export function truthProofProgress(
  distance: number,
  isActing: boolean,
  now: number,
  lastMovedAt: number,
  holdMs: number,
) {
  if (distance > 1.18 || isActing) return 0;
  return Math.max(0, Math.min(1, (now - lastMovedAt) / holdMs));
}

export function advanceMeasureProof(
  currentMs: number,
  distance: number,
  minimum: number,
  maximum: number,
  holdMs: number,
  deltaMs: number,
) {
  const held = distance >= minimum && distance <= maximum;
  const milliseconds = held ? currentMs + deltaMs : Math.max(0, currentMs - deltaMs * 0.75);
  return { held, milliseconds, progress: Math.max(0, Math.min(1, milliseconds / holdMs)) };
}

export function resilienceContact(relocated: boolean, distance: number) {
  if (distance >= 0.62) return "none" as const;
  return relocated ? "open" as const : "relocate" as const;
}
