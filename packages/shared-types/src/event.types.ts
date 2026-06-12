export enum EventStatus {
  Pending = "pending",
  Processing = "processing",
  Delivered = "delivered",
  Failed = "failed",
  PartialFailure = "partial_failure",
}

export interface Event {
  id: string;
  orgId: string;
  pipelineId: string;
  status: EventStatus;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  receivedAt: Date;
  processedAt?: Date;
  deliveredAt?: Date;
}
