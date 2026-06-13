import {
  createTaskCreatedEvent,
  insertTask,
  TASK_AGGREGATE,
  taskCreatedPayload,
} from "@new-cursor/tasks-feature";

import { os } from "../os";
import { eventSpec, withEvent } from "../with-event";

const createHandler = os.tasks.create.handler(
  withEvent({
    run: async ({ tx, input }) => {
      const projection = await insertTask(tx, {
        title: input.title,
        branchName: input.branchName ?? null,
        repositoryId: input.repositoryId ?? null,
        parentTaskId: input.parentTaskId ?? null,
      });

      return {
        result: projection,
        events: eventSpec({
          aggregate: projection,
          payload: taskCreatedPayload({
            id: projection.id,
            title: projection.title,
            branchName: projection.branchName,
            repositoryId: projection.repositoryId,
            parentTaskId: projection.parentTaskId,
          }),
          factory: createTaskCreatedEvent,
          occurredAtFrom: "created",
        }),
      };
    },
  }),
);

export const tasksHandlers = {
  create: createHandler,
};

export { TASK_AGGREGATE };
