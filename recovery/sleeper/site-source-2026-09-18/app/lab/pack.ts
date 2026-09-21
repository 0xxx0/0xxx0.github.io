import { seedFromSource, seedLabel } from "../lib/seed.ts";
import { isLabFieldId, type LabFieldId } from "./catalog.ts";

export type { LabFieldId } from "./catalog.ts";

export const FIELD_PACK_VERSION = 1 as const;

export type UtilityDoor = "CALM" | "HOME" | "ORACLE" | "TOGETHER";

export type TraceEvent = {
  tick: number;
  action: string;
  target?: string;
  value?: number | string | boolean;
};

export type UtilityReturn = {
  door: UtilityDoor;
  note?: string;
  question?: string;
  options?: [string, string];
  choice?: 0 | 1;
};

export type LabTransferArtifact = {
  schema: "sleeper.transfer";
  version: 1;
  from: LabFieldId;
  sourceSeed: number;
  sourceSeedLabel: string;
  kind:
    | "ordered-line"
    | "signal-mask"
    | "weather-line"
    | "route-ledger"
    | "operator-chain"
    | "composite-mask"
    | "selection-proof"
    | "calibration-ledger"
    | "decoded-grammar"
    | "causal-trace"
    | "path-line"
    | "image-route";
  value: string;
  invariant: string;
  evidence: Record<string, unknown>;
  parent?: LabTransferArtifact;
};

export function makeLabTransfer(
  from: LabFieldId,
  source: string,
  kind: LabTransferArtifact["kind"],
  value: string,
  invariant: string,
  evidence: Record<string, unknown>,
): LabTransferArtifact {
  return {
    schema: "sleeper.transfer",
    version: 1,
    from,
    sourceSeed: seedFromSource(source),
    sourceSeedLabel: seedLabel(source),
    kind,
    value: value.slice(0, 1_200),
    invariant,
    evidence,
  };
}

export type FieldPack<Result = unknown, Payload = Record<string, unknown>> = {
  schema: "sleeper.field-pack";
  version: typeof FIELD_PACK_VERSION;
  field: LabFieldId;
  source: string;
  seed: number;
  seedLabel: string;
  payload: Payload;
  trace: TraceEvent[];
  result?: Result;
  utility?: UtilityReturn;
};

export function createFieldPack<Result = unknown, Payload = Record<string, unknown>>(
  field: LabFieldId,
  source: string,
  payload: Payload,
  trace: TraceEvent[] = [],
  result?: Result,
  utility?: UtilityReturn,
): FieldPack<Result, Payload> {
  const normalized = source.trim().replace(/\s+/g, " ").slice(0, 1200) || "ONE RETURN";
  return {
    schema: "sleeper.field-pack",
    version: FIELD_PACK_VERSION,
    field,
    source: normalized,
    seed: seedFromSource(normalized),
    seedLabel: seedLabel(normalized),
    payload,
    trace: trace.slice(0, 512),
    ...(result === undefined ? {} : { result }),
    ...(utility ? { utility } : {}),
  };
}

export type ParsePackResult =
  | { ok: true; pack: FieldPack }
  | { ok: false; error: string };

function cleanTrace(value: unknown): TraceEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const event = entry as Partial<TraceEvent>;
    if (typeof event.tick !== "number" || !Number.isFinite(event.tick) || typeof event.action !== "string" || !event.action.trim()) return [];
    const target = typeof event.target === "string" ? event.target.slice(0, 180) : undefined;
    const primitive = ["string", "number", "boolean"].includes(typeof event.value) ? event.value : undefined;
    return [{ tick: Math.max(0, Math.floor(event.tick)), action: event.action.slice(0, 80), ...(target ? { target } : {}), ...(primitive === undefined ? {} : { value: primitive as string | number | boolean }) }];
  }).slice(0, 512);
}

function cleanUtility(value: unknown): UtilityReturn | undefined {
  if (!value || typeof value !== "object") return undefined;
  const utility = value as Partial<UtilityReturn>;
  if (!utility.door || !["CALM", "HOME", "ORACLE", "TOGETHER"].includes(utility.door)) return undefined;
  return {
    door: utility.door,
    ...(typeof utility.note === "string" ? { note: utility.note.slice(0, 180) } : {}),
    ...(typeof utility.question === "string" ? { question: utility.question.slice(0, 220) } : {}),
    ...(Array.isArray(utility.options) && utility.options.length === 2 && utility.options.every((option) => typeof option === "string") ? { options: [utility.options[0].slice(0, 90), utility.options[1].slice(0, 90)] as [string, string] } : {}),
    ...(utility.choice === 0 || utility.choice === 1 ? { choice: utility.choice } : {}),
  };
}

export function parseFieldPack(raw: string): ParsePackResult {
  if (raw.length > 160_000) return { ok: false, error: "That pack is larger than the Lab accepts." };
  try {
    const candidate = JSON.parse(raw) as Partial<FieldPack>;
    if (candidate.schema !== "sleeper.field-pack" || candidate.version !== FIELD_PACK_VERSION) {
      return { ok: false, error: "This is not a Sleeper Field Pack v1." };
    }
    if (!isLabFieldId(candidate.field)) {
      return { ok: false, error: "The pack names an unknown field." };
    }
    if (typeof candidate.source !== "string" || !candidate.source.trim()) {
      return { ok: false, error: "The pack has no source material." };
    }
    if (candidate.payload !== undefined && (!candidate.payload || typeof candidate.payload !== "object" || Array.isArray(candidate.payload))) {
      return { ok: false, error: "The pack payload must be an object." };
    }
    const payload = (candidate.payload ?? {}) as Record<string, unknown>;
    if (candidate.field === "scale" && payload.imageMetrics !== undefined &&
      (!Array.isArray(payload.imageMetrics) || payload.imageMetrics.length !== 9 ||
       !payload.imageMetrics.every((cell) => cell && typeof cell === "object" &&
         [cell.brightness, cell.edges].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1)))) {
      return { ok: false, error: "The image pack needs nine valid measured regions." };
    }
    const rebuilt = createFieldPack(
      candidate.field as LabFieldId,
      candidate.source,
      (candidate.payload ?? {}) as Record<string, unknown>,
      cleanTrace(candidate.trace),
      candidate.result,
      cleanUtility(candidate.utility),
    );
    if (typeof candidate.seed === "number" && candidate.seed !== rebuilt.seed) {
      return { ok: false, error: "The source and seed disagree; the pack may have drifted." };
    }
    return { ok: true, pack: rebuilt };
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
}

export function packFilename(pack: FieldPack) {
  return `sleeper-${pack.field}-${pack.seedLabel.toLowerCase()}.json`;
}
