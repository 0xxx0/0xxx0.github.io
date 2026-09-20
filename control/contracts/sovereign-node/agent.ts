import type { ExecutionReceipt } from "./receipt";
import type { Provider } from "./provider";

export type WorkspaceMode = "read-only" | "read-write";
export type NetworkPolicy = "none" | "restricted" | "full";
export type DestructiveActionPolicy = "deny" | "require-approval";
export type SecretsPolicy = "none" | "named-only";
export type AgentRunStatus =
  | "completed"
  | "blocked"
  | "needs-approval"
  | "failed"
  | "timeout";
export type AgentOutputType = "file" | "patch" | "message" | "measurement";
export type ProposedActionRisk =
  | "read"
  | "write"
  | "destructive"
  | "external";

export interface ToolScope {
  paths?: string[];
  hosts?: string[];
}

export interface ToolGrant {
  name: string;
  permissions?: string[];
  scope?: ToolScope;
}

export interface AgentInput {
  name: string;
  uri: string;
  mimeType?: string;
  sha256?: string;
}

export interface AgentWorkspace {
  root: string;
  mode: WorkspaceMode;
}

export interface AgentRunLimits {
  timeoutMs: number;
  maxSteps?: number;
  maxCostUsd?: number;
}

export interface AgentContinuation {
  continuationRef?: string;
}

export interface AgentPolicy {
  network: NetworkPolicy;
  destructiveActions: DestructiveActionPolicy;
  secrets: SecretsPolicy;
  allowedSecrets?: string[];
}

export interface AgentRunRequest {
  id: string;
  objective: string;
  workspace: AgentWorkspace;
  inputs?: AgentInput[];
  tools: ToolGrant[];
  limits: AgentRunLimits;
  state?: AgentContinuation;
  policy: AgentPolicy;
}

export interface ProposedAction {
  id: string;
  tool: string;
  args: unknown;
  risk: ProposedActionRisk;
  approvalRequired: boolean;
}

export interface AgentOutput {
  type: AgentOutputType;
  uri?: string;
  value?: unknown;
  mimeType?: string;
  sha256?: string;
}

export interface AgentExecutorDescriptor {
  name: "openclaw" | "hermes" | string;
  version?: string;
  local?: boolean;
}

export interface AgentRunResponse {
  id: string;
  status: AgentRunStatus;
  summary: string;
  outputs?: AgentOutput[];
  proposedActions?: ProposedAction[];
  continuationRef?: string;
  provider: AgentExecutorDescriptor;
  receipt: ExecutionReceipt;
}

export interface AgentExecutor
  extends Provider<AgentRunRequest, AgentRunResponse> {
  readonly kind: "agent";
}

export const exampleAgentRunRequest: AgentRunRequest = {
  id: "run-103",
  objective:
    "Inspect this repository and propose the smallest patch fixing the failing build.",
  workspace: {
    root: "/worktrees/atlas-fix",
    mode: "read-write",
  },
  tools: [
    {
      name: "shell",
      permissions: ["read", "execute"],
      scope: { paths: ["/worktrees/atlas-fix"] },
    },
    {
      name: "git",
      permissions: ["diff", "status"],
    },
  ],
  limits: {
    timeoutMs: 300_000,
    maxSteps: 30,
  },
  policy: {
    network: "restricted",
    destructiveActions: "require-approval",
    secrets: "none",
  },
};

export const exampleProposedAction: ProposedAction = {
  id: "act-001",
  tool: "shell",
  args: { command: "rm old-cache.db" },
  risk: "destructive",
  approvalRequired: true,
};

export const exampleAgentRunResponse: AgentRunResponse = {
  id: "run-103",
  status: "needs-approval",
  summary:
    "The build failure is caused by a stale cache. A destructive cleanup is proposed but has not been executed.",
  outputs: [{
    type: "message",
    value: "Patch inspection completed.",
  }],
  proposedActions: [exampleProposedAction],
  provider: {
    name: "openclaw",
    version: "example",
    local: true,
  },
  receipt: {
    ok: true,
    durationMs: 2_341,
    providerRequestId: "agent-example",
  },
};
