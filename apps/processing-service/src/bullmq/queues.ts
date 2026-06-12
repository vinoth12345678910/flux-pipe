import { Queue } from "bullmq";
import { getClient } from "@fluxpipe/redis";

const redisClient = getClient() as any;

export const transformQueue = new Queue("transform", { connection: redisClient });
export const enrichQueue = new Queue("enrich", { connection: redisClient });
export const routeQueue = new Queue("route", { connection: redisClient });

export const QUEUES = {
  TRANSFORM: "transform",
  ENRICH: "enrich",
  ROUTE: "route",
} as const;
