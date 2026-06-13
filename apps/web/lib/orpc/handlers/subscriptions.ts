import {
  createSubscriptionUpsertedEvent,
  findSubscriptionById,
  listSubscriptions,
  SUBSCRIPTION_AGGREGATE,
  SubscriptionFeatureError,
  subscriptionUpsertedPayload,
  upsertSubscription,
} from "@new-cursor/subscriptions-feature";

import { mapErrors } from "../errors";
import { os } from "../os";
import { eventSpec, withEvent } from "../with-event";

const upsertHandler = os.subscriptions.upsert.handler(
  withEvent({
    run: async ({ tx, input }) => {
      const projection = await upsertSubscription(tx, {
        agentId: input.agentId,
        eventTypes: input.eventTypes,
      });

      return {
        result: projection,
        events: eventSpec({
          aggregate: projection,
          payload: subscriptionUpsertedPayload({
            id: projection.id,
            agentId: projection.agentId,
            eventTypes: projection.eventTypes,
          }),
          factory: createSubscriptionUpsertedEvent,
          occurredAtFrom: "updated",
        }),
      };
    },
  }),
);

const listHandler = os.subscriptions.list.handler(({ context, input }) =>
  mapErrors(async () =>
    listSubscriptions(context.db, {
      filters: input.filters,
      sort: input.sort,
      limit: input.limit,
      offset: input.offset,
    }),
  ),
);

const getHandler = os.subscriptions.get.handler(({ context, input }) =>
  mapErrors(async () => {
    const projection = await findSubscriptionById(context.db, input.id);
    if (!projection) {
      throw SubscriptionFeatureError.notFound(input.id);
    }
    return projection;
  }),
);

export const subscriptionsHandlers = {
  upsert: upsertHandler,
  list: listHandler,
  get: getHandler,
};

export { SUBSCRIPTION_AGGREGATE };
