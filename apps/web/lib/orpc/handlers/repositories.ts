import {
  createRepositoryRegisteredEvent,
  findRepositoryById,
  listRepositories,
  REPOSITORY_AGGREGATE,
  RepositoryFeatureError,
  registerRepository,
  repositoryRegisteredPayload,
} from "@new-cursor/repositories-feature";

import { mapErrors } from "../errors";
import { os } from "../os";
import { eventSpec, withEvent } from "../with-event";

const registerHandler = os.repositories.register.handler(
  withEvent({
    run: async ({ tx, input }) => {
      const projection = await registerRepository(tx, {
        name: input.name,
        remoteUrl: input.remoteUrl,
        isExternal: input.isExternal,
      });

      return {
        result: projection,
        events: eventSpec({
          aggregate: projection,
          payload: repositoryRegisteredPayload({
            id: projection.id,
            name: projection.name,
            remoteUrl: projection.remoteUrl,
            isExternal: projection.isExternal,
          }),
          factory: createRepositoryRegisteredEvent,
          occurredAtFrom: "created",
        }),
      };
    },
  }),
);

const listHandler = os.repositories.list.handler(({ context, input }) =>
  mapErrors(async () =>
    listRepositories(context.db, {
      search: input.search,
      sort: input.sort,
      limit: input.limit,
      offset: input.offset,
    }),
  ),
);

const getHandler = os.repositories.get.handler(({ context, input }) =>
  mapErrors(async () => {
    const projection = await findRepositoryById(context.db, input.id);
    if (!projection) {
      throw RepositoryFeatureError.notFound(input.id);
    }
    return projection;
  }),
);

export const repositoriesHandlers = {
  register: registerHandler,
  list: listHandler,
  get: getHandler,
};

export { REPOSITORY_AGGREGATE };
