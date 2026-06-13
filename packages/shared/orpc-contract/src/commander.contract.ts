import { oc } from "@orpc/contract";
import { z } from "zod";

import { taskProjectionSchema } from "./tasks.schemas";

const sendInput = z.object({
  message: z.string().min(1),
  agentId: z.string().nullable().optional(),
  modelId: z.string().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
});

const sendOutput = z.object({
  agentId: z.string(),
  reply: z.string(),
  taskCreated: taskProjectionSchema.optional(),
});

const resetOutput = z.object({
  ok: z.literal(true),
});

export const commanderContract = oc.router({
  send: oc.input(sendInput).output(sendOutput),
  reset: oc.output(resetOutput),
});

export type CommanderSendInput = z.infer<typeof sendInput>;
export type CommanderSendOutput = z.infer<typeof sendOutput>;
