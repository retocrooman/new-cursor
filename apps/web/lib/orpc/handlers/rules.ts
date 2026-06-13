import {
  createRule,
  createRuleCreatedEvent,
  findRuleById,
  listRules,
  RULE_AGGREGATE,
  RuleFeatureError,
  ruleCreatedPayload,
} from "@new-cursor/rules-feature";

import { mapErrors } from "../errors";
import { os } from "../os";
import { eventSpec, withEvent } from "../with-event";

const createHandler = os.rules.create.handler(
  withEvent({
    run: async ({ tx, input }) => {
      const projection = await createRule(tx, {
        labelId: input.labelId,
        content: input.content,
      });

      return {
        result: projection,
        events: eventSpec({
          aggregate: projection,
          payload: ruleCreatedPayload({
            id: projection.id,
            labelId: projection.labelId,
            content: projection.content,
          }),
          factory: createRuleCreatedEvent,
          occurredAtFrom: "created",
        }),
      };
    },
  }),
);

const listHandler = os.rules.list.handler(({ context, input }) =>
  mapErrors(async () =>
    listRules(context.db, {
      search: input.search,
      filters: input.filters,
      sort: input.sort,
      limit: input.limit,
      offset: input.offset,
    }),
  ),
);

const getHandler = os.rules.get.handler(({ context, input }) =>
  mapErrors(async () => {
    const projection = await findRuleById(context.db, input.id);
    if (!projection) {
      throw RuleFeatureError.notFound(input.id);
    }
    return projection;
  }),
);

export const rulesHandlers = {
  create: createHandler,
  list: listHandler,
  get: getHandler,
};

export { RULE_AGGREGATE };
