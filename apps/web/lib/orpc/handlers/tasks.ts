import {
  createTaskCreatedEvent,
  findTaskById,
  insertTask,
  listTasks,
  TASK_AGGREGATE,
  TaskFeatureError,
  taskCreatedPayload,
} from "@new-cursor/tasks-feature";

import { mapErrors } from "../errors";
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
        background: input.background ?? null,
        verificationItems: input.verificationItems ?? null,
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
            background: projection.background,
            verificationItems: projection.verificationItems,
          }),
          factory: createTaskCreatedEvent,
          occurredAtFrom: "created",
        }),
      };
    },
  }),
);

const listHandler = os.tasks.list.handler(({ context, input }) =>
  mapErrors(async () =>
    listTasks(context.db, {
      search: input.search,
      sort: input.sort,
      limit: input.limit,
      offset: input.offset,
      filters: input.filters,
    }),
  ),
);

const getHandler = os.tasks.get.handler(({ context, input }) =>
  mapErrors(async () => {
    const projection = await findTaskById(context.db, input.id);
    if (!projection) {
      throw TaskFeatureError.notFound(input.id);
    }
    return projection;
  }),
);

export const tasksHandlers = {
  create: createHandler,
  list: listHandler,
  get: getHandler,
};

export { TASK_AGGREGATE };
