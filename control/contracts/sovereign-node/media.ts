import type { ExecutionReceipt } from "./receipt";
import type { Provider } from "./provider";

export type MediaKind = "image" | "video" | "audio";
export type MediaOperation = "generate" | "transform" | "extend" | "animate";
export type MediaStatus = "complete" | "partial" | "rejected" | "error";

export interface MediaInput {
  uri?: string;
  bytesRef?: string;
  mimeType?: string;
  sha256?: string;
}

export interface MediaParameters {
  width?: number;
  height?: number;
  durationSec?: number;
  fps?: number;
  seed?: number;
}

export interface MediaConstraints {
  maxCostUsd?: number;
  maxLatencyMs?: number;
  localOnly?: boolean;
}

export interface MediaRequest {
  id: string;
  operation: MediaOperation;
  outputKind: MediaKind;
  prompt?: string;
  inputs?: MediaInput[];
  parameters?: MediaParameters;
  constraints?: MediaConstraints;
}

export interface MediaArtifact {
  uri: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sha256?: string;
}

export interface MediaProviderDescriptor {
  name: string;
  model?: string;
  version?: string;
  local: boolean;
}

export interface MediaUsage {
  costUsd?: number;
  durationMs?: number;
}

export interface MediaResponse {
  id: string;
  status: MediaStatus;
  artifacts: MediaArtifact[];
  provider: MediaProviderDescriptor;
  usage?: MediaUsage;
  receipt: ExecutionReceipt;
}

export interface MediaProvider
  extends Provider<MediaRequest, MediaResponse> {
  readonly kind: "media";
}

export const exampleMediaRequest: MediaRequest = {
  id: "media-011",
  operation: "animate",
  outputKind: "video",
  prompt: "Slow architectural camera drift. Preserve geometry and text.",
  inputs: [{
    uri: "file:///atlas/frame-011.png",
    mimeType: "image/png",
  }],
  parameters: {
    durationSec: 6,
    fps: 24,
  },
  constraints: {
    maxCostUsd: 1.5,
    localOnly: false,
  },
};

export const exampleMediaResponse: MediaResponse = {
  id: "media-011",
  status: "complete",
  artifacts: [{
    uri: "file:///receipts/media-011/output.mp4",
    mimeType: "video/mp4",
    durationSec: 6,
    sha256: "sha256:example-output",
  }],
  provider: {
    name: "remote-media",
    model: "selected-at-runtime",
    local: false,
  },
  usage: {
    costUsd: 0.73,
    durationMs: 48_122,
  },
  receipt: {
    ok: true,
    providerRequestId: "media-example",
    durationMs: 48_122,
  },
};
