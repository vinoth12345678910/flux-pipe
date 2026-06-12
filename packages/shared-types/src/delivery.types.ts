export enum DeliveryStatus {
  Pending = "pending",
  Success = "success",
  Failed = "failed",
  Retrying = "retrying",
}

export type DestinationType = "webhook" | "s3" | "kafka" | "http";

export interface Destination {
  id: string;
  name: string;
  type: DestinationType;
  pipelineId: string;
  config: Record<string, unknown>;
  isActive: boolean;
}

export interface DeliveryAttempt {
  id: string;
  eventId: string;
  destinationId: string;
  attemptNumber: number;
  status: DeliveryStatus;
  responseCode?: number;
  latencyMs?: number;
  errorMessage?: string;
  attemptedAt: Date;
}
