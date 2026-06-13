import type { DbOrTx } from "@new-cursor/db";
import type { AppendableEvent, EventEnvelopeInput } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";

type EventProjection = {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkerEventSpec = {
  readonly aggregate: EventProjection;
  readonly payload: unknown;
  readonly factory: (
    input: EventEnvelopeInput & { payload: unknown },
  ) => AppendableEvent;
  readonly occurredAtFrom: "created" | "updated";
};

export function workerEventSpec<
  P extends EventProjection,
  E extends AppendableEvent,
>(spec: {
  aggregate: P;
  payload: E["payload"];
  factory: (input: EventEnvelopeInput & { payload: E["payload"] }) => E;
  occurredAtFrom: "created" | "updated";
}): WorkerEventSpec {
  return spec as unknown as WorkerEventSpec;
}

function workerEnvelope(
  projection: EventProjection,
  actorId: string,
  occurredAtFrom: "created" | "updated",
) {
  return {
    aggregateId: projection.id,
    actorId,
    version: projection.version,
    occurredAt:
      occurredAtFrom === "updated"
        ? projection.updatedAt
        : projection.createdAt,
  };
}

/** Worker 向け: appendEvent + writeOutbox + projection を同一 tx で実行。 */
export async function withEvent(
  tx: DbOrTx,
  opts: {
    actorId: string;
    run: (args: { tx: DbOrTx }) => Promise<{
      events: WorkerEventSpec | WorkerEventSpec[];
    }>;
  },
): Promise<void> {
  const { events } = await opts.run({ tx });
  const list = Array.isArray(events) ? events : [events];
  for (const spec of list) {
    const appendable = spec.factory({
      ...workerEnvelope(spec.aggregate, opts.actorId, spec.occurredAtFrom),
      payload: spec.payload,
    });
    const { eventId } = await appendEvent(tx, appendable);
    await writeOutbox(tx, { ...appendable, eventId });
  }
}
