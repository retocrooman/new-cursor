import {
  createTaskDecision,
  listDecisionsByTask,
  TaskFeatureError,
} from "@new-cursor/tasks-feature";

import { mapErrors } from "../errors";
import { os } from "../os";

const listByTaskHandler = os.decisions.listByTask.handler(
  ({ context, input }) =>
    mapErrors(async () => listDecisionsByTask(context.db, input.taskId)),
);

const createHandler = os.decisions.create.handler(({ context, input }) =>
  mapErrors(async () =>
    createTaskDecision(context.db, {
      taskId: input.taskId,
      summary: input.summary,
      context: input.context ?? null,
      userResponse: input.userResponse ?? null,
      agentId: input.agentId ?? null,
    }),
  ),
);

export const decisionsHandlers = {
  listByTask: listByTaskHandler,
  create: createHandler,
};

export { TaskFeatureError };
