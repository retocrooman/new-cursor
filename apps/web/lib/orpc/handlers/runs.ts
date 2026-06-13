import {
  createRun,
  createRunStartedEvent,
  listRuns,
  RUN_AGGREGATE,
  runStartedPayload,
} from "@new-cursor/runs-feature";

import { mapErrors } from "../errors";
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

const listHandler = os.runs.list.handler(({ context, input }) =>
  mapErrors(async () =>
    listRuns(context.db, {
      filters: input.filters,
      sort: input.sort,
      limit: input.limit,
      offset: input.offset,
    }),
  ),
);

export const runsHandlers = {
  create: createHandler,
  list: listHandler,
};

export { RUN_AGGREGATE };
