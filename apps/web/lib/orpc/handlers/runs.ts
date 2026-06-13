import {
  createRun,
  createRunStartedEvent,
  RUN_AGGREGATE,
  runStartedPayload,
} from "@new-cursor/runs-feature";

import { os } from "../os";
import { eventSpec, withEvent } from "../with-event";

const createHandler = os.runs.create.handler(
  withEvent({
    run: async ({ tx, input }) => {
      const projection = await createRun(tx, {
        taskId: input.taskId,
        agentId: input.agentId,
        stage: input.stage ?? null,
        summary: input.summary ?? null,
      });

      return {
        result: projection,
        events: eventSpec({
          aggregate: projection,
          payload: runStartedPayload({
            id: projection.id,
            taskId: projection.taskId,
            agentId: projection.agentId,
            stage: projection.stage,
            summary: projection.summary,
          }),
          factory: createRunStartedEvent,
          occurredAtFrom: "created",
        }),
      };
    },
  }),
);

export const runsHandlers = {
  create: createHandler,
};

export { RUN_AGGREGATE };
