export type ProviderStatus = "healthy" | "degraded" | "unavailable";

export interface ProviderHealth {
  status: ProviderStatus;
  provider: string;
  version?: string;
  model?: string;
  local: boolean;
  checkedAt?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface Provider<TRequest, TResponse> {
  readonly name: string;
  readonly kind: string;
  health(): Promise<ProviderHealth>;
  execute(request: TRequest): Promise<TResponse>;
}

export type FallbackCondition =
  | "unavailable"
  | "timeout"
  | "budget"
  | "policy";

export type NoFallbackCondition =
  | "security"
  | "invalid-request";

export interface FallbackPolicy {
  providers: string[];
  on: FallbackCondition[];
  neverFallbackOn?: NoFallbackCondition[];
}

export interface ProviderSelection {
  provider: string;
  reason: "preferred" | "fallback" | "policy" | "local-only";
}

export interface ProviderRouter<TRequest, TResponse> {
  execute(request: TRequest, policy?: FallbackPolicy): Promise<TResponse>;
  health(): Promise<ProviderHealth[]>;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface LocalTaskRunner {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  run(command: readonly string[], cwd: string): Promise<ProcessResult>;
  gitDiff(cwd: string): Promise<string>;
}

export const defaultFallbackPolicy: FallbackPolicy = {
  providers: [],
  on: ["unavailable", "timeout", "budget", "policy"],
  neverFallbackOn: ["security", "invalid-request"],
};
