import type { ExecutionReceipt } from "./receipt";
import type { Provider } from "./provider";

export type DecisionStatus = "decided" | "abstained" | "error";
export type DecisionOption = string;

export interface DecisionConstraints {
  requireConfidence?: number;
  abstainAllowed?: boolean;
  maxLatencyMs?: number;
  localOnly?: boolean;
}

export interface DecisionMetadata {
  schemaVersion: "1";
  source?: string;
  timestamp?: string;
  traceId?: string;
}

export interface DecisionRequest<TContext = unknown> {
  id: string;
  task: string;
  context: TContext;
  options: DecisionOption[];
  constraints?: DecisionConstraints;
  metadata?: DecisionMetadata;
}

export interface DecisionProviderDescriptor {
  name: string;
  model?: string;
  version?: string;
  local: boolean;
}

export interface DecisionResponse {
  id: string;
  decision: string | null;
  probabilities?: Record<string, number>;
  confidence: number;
  status: DecisionStatus;
  provider: DecisionProviderDescriptor;
  reasoning?: string;
  receipt: ExecutionReceipt;
}

export interface DecisionProvider<TContext = unknown>
  extends Provider<DecisionRequest<TContext>, DecisionResponse> {
  readonly kind: "decision";
}

export interface AgentTraceDecisionContext {
  tool: string;
  command?: string;
  workspace?: string;
  destructive?: boolean;
  outsideWorkspace?: boolean;
}

export type AgentTraceDecisionRequest =
  DecisionRequest<AgentTraceDecisionContext>;

export const exampleDecisionRequest: AgentTraceDecisionRequest = {
  id: "dec-0042",
  task: "classify_agent_trace",
  context: {
    tool: "shell",
    command: "rm -rf ./cache",
    workspace: "/srv/agent/test",
    destructive: true,
    outsideWorkspace: false,
  },
  options: ["ALLOW", "REVIEW", "DENY"],
  constraints: {
    requireConfidence: 0.8,
    abstainAllowed: true,
    localOnly: false,
  },
  metadata: {
    schemaVersion: "1",
    source: "agent-policy-gate",
  },
};

export const exampleDecisionResponse: DecisionResponse = {
  id: "dec-0042",
  decision: "REVIEW",
  probabilities: {
    ALLOW: 0.07,
    REVIEW: 0.88,
    DENY: 0.05,
  },
  confidence: 0.88,
  status: "decided",
  provider: {
    name: "local-qwen",
    model: "qwen-local",
    local: true,
  },
  receipt: {
    ok: true,
    durationMs: 412,
    providerRequestId: "local-9834",
  },
};
