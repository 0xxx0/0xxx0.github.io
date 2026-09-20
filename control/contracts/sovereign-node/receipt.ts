export interface ExecutionError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface ExecutionReceipt {
  ok: boolean;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  providerRequestId?: string;
  inputHash?: string;
  outputHash?: string;
  warnings?: string[];
  error?: ExecutionError;
}

export const exampleExecutionReceipt: ExecutionReceipt = {
  ok: true,
  startedAt: "2026-09-18T07:00:00.000Z",
  finishedAt: "2026-09-18T07:00:00.412Z",
  durationMs: 412,
  providerRequestId: "local-9834",
  inputHash: "sha256:example-input",
  outputHash: "sha256:example-output",
};
