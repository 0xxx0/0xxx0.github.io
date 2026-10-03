import type {
  AgentPolicy,
  AgentWorkspace,
  ToolGrant,
} from "./agent";
import type { ExecutionReceipt } from "./receipt";

/**
 * FIELD addresses and serializes a handoff; it does not authorize or execute it.
 * The receiving host resolves capability ownership, applies policy, executes (or
 * rejects) the request, and returns a receipt. Raw/protected content is carried
 * by reference by default rather than copied into the handoff envelope.
 */
export type FieldHandoffSensitivity = "public" | "local" | "protected";
export type FieldHandoffRetention = "ephemeral" | "receipt-only" | "case-local";
export type OperatorBridgeDecision = "accepted" | "rejected" | "needs-approval";
export type OperatorBridgeRunStatus =
  | "completed"
  | "blocked"
  | "needs-approval"
  | "failed"
  | "expired";
export type OperatorMutationClass =
  | "none"
  | "workspace"
  | "device"
  | "external";

export interface FieldResourceRef {
  routeId: string;
  address: string;
  sourceRef?: string;
  revision?: string;
}

export interface HandoffInputRef {
  name: string;
  uri: string;
  mimeType?: string;
  sha256?: string;
}

export interface FieldProjectionContext {
  /** FIELD never mints execution authority. */
  authority: "NONE";
  resource: FieldResourceRef;
  /** Host-owned manifest operation; FIELD does not reinterpret it. */
  operation?: string;
  /** Existing HOLD / TURN / TRACE / RETURN surface action, when present. */
  action?: "HOLD" | "TURN" | "TRACE" | "RETURN";
  /** Exact re-entry address for evidence after execution. */
  returnTo: string;
  /** Renderer/origin only; never an authority claim. */
  originSurface?: string;
}

export interface OperatorCapabilityRequest {
  /** Stable capability identifier owned by the receiving host/adapter. */
  capability: string;
  /** Native owner that defines the capability semantics and permission checks. */
  capabilityOwner: string;
  adapter: string;
  inputRefs?: HandoffInputRef[];
  workspace?: AgentWorkspace;
  tools?: ToolGrant[];
  policy: AgentPolicy;
  sensitivity: FieldHandoffSensitivity;
  retention: FieldHandoffRetention;
  expiresAt?: string;
  nonce?: string;
}

export interface FieldOperatorHandoff {
  schema: "0xxx0/field-operator-handoff/v0.1";
  id: string;
  createdAt: string;
  field: FieldProjectionContext;
  request: OperatorCapabilityRequest;
}

export interface OperatorBridgeAcceptance {
  handoffId: string;
  decision: OperatorBridgeDecision;
  acceptedBy: string;
  /** Host-native policy/trace reference; FIELD focus itself grants nothing. */
  policyTraceRef?: string;
  approvalRef?: string;
  reason?: string;
}

export interface OperatorOutputRef {
  name: string;
  uri: string;
  mimeType?: string;
  sha256?: string;
}

export interface OperatorBridgeResult {
  handoffId: string;
  status: OperatorBridgeRunStatus;
  mutation: OperatorMutationClass;
  outputs?: OperatorOutputRef[];
  undoRef?: string;
  /** Durable evidence address owned by the receiving host / RETURN path. */
  returnRef: string;
  receipt: ExecutionReceipt;
}

/**
 * Constrained physical/device request. The payload names a registered,
 * host-owned capability and artifact reference; it is not an arbitrary shell
 * command or executable blob. Signing/secure-boot policy remains device-owned.
 */
export interface DeviceCapabilityRequest {
  target: string;
  capability: string;
  artifactRef?: string;
  artifactSha256?: string;
  signatureRef?: string;
  expiresAt?: string;
  nonce?: string;
}

/**
 * Optional compartment hints for protected research. These describe where a
 * receiving research host should run the request; they do not weaken its own
 * network, identity, retention, or provenance policy.
 */
export interface ProtectedResearchScope {
  caseRef: string;
  environment: "isolated-browser" | "isolated-workspace" | "offline";
  capture: "none" | "receipt" | "web-archive";
  exportPolicy: "deny" | "review" | "sanitized-only";
}

export const exampleFieldOperatorHandoff: FieldOperatorHandoff = {
  schema: "0xxx0/field-operator-handoff/v0.1",
  id: "handoff-example-001",
  createdAt: "2026-10-03T13:46:00+08:00",
  field: {
    authority: "NONE",
    resource: {
      routeId: "example-route",
      address: "/example/",
    },
    operation: "VERIFY",
    action: "TURN",
    returnTo: "/returns/",
    originSurface: "field-web",
  },
  request: {
    capability: "repository.verify",
    capabilityOwner: "sovereign-node",
    adapter: "hermes",
    workspace: {
      root: "/worktrees/example-route",
      mode: "read-only",
    },
    tools: [
      {
        name: "git",
        permissions: ["status", "diff"],
      },
    ],
    policy: {
      network: "restricted",
      destructiveActions: "deny",
      secrets: "none",
    },
    sensitivity: "local",
    retention: "receipt-only",
  },
};
