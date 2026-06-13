import {
  AGENT_AGGREGATE,
  AgentFeatureError,
  agentCreatedPayload,
  createAgent,
  createAgentCreatedEvent,
  findAgentById,
  listAgents,
  updateAgent,
} from "@new-cursor/agents-feature";

import { mapErrors } from "../errors";
import { os } from "../os";
import { eventSpec, withEvent } from "../with-event";

const createHandler = os.agents.create.handler(
  withEvent({
    run: async ({ tx, input }) => {
      const projection = await createAgent(tx, {
        name: input.name,
        description: input.description ?? null,
        labels: input.labels,
      });

      return {
        result: projection,
        events: eventSpec({
          aggregate: projection,
          payload: agentCreatedPayload({
            id: projection.id,
            name: projection.name,
            description: projection.description,
            labelIds: projection.labels.map((label) => label.id),
          }),
          factory: createAgentCreatedEvent,
          occurredAtFrom: "created",
        }),
      };
    },
  }),
);

const listHandler = os.agents.list.handler(({ context, input }) =>
  mapErrors(async () =>
    listAgents(context.db, {
      search: input.search,
      sort: input.sort,
      limit: input.limit,
      offset: input.offset,
    }),
  ),
);

const getHandler = os.agents.get.handler(({ context, input }) =>
  mapErrors(async () => {
    const projection = await findAgentById(context.db, input.id);
    if (!projection) {
      throw AgentFeatureError.notFound(input.id);
    }
    return projection;
  }),
);

const updateHandler = os.agents.update.handler(({ context, input }) =>
  mapErrors(async () =>
    updateAgent(context.db, input.id, { modelId: input.modelId }),
  ),
);

export const agentsHandlers = {
  create: createHandler,
  list: listHandler,
  get: getHandler,
  update: updateHandler,
};

export { AGENT_AGGREGATE };
