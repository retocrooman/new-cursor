import { eq, events, outbox, repositories } from "@new-cursor/db";
import { SYSTEM_ACTOR_ID } from "@new-cursor/events";
import { appendEvent, writeOutbox } from "@new-cursor/events/server";
import {
  createRepositoryRegisteredEvent,
  registerRepository,
  repositoryRegisteredPayload,
} from "@new-cursor/repositories-feature";
import { withRollbackTx } from "@new-cursor/vitest-config/setup";
import { describe, expect, it } from "vitest";

describe("registerRepository", () => {
  it("creates a repository projection row", async () => {
    await withRollbackTx(async (tx) => {
      const projection = await registerRepository(tx, {
        name: "new-cursor",
        remoteUrl: "https://github.com/org/new-cursor.git",
        isExternal: true,
      });

      expect(projection.name).toBe("new-cursor");
      expect(projection.isExternal).toBe(true);

      const rows = await tx
        .select()
        .from(repositories)
        .where(eq(repositories.id, projection.id));
      expect(rows).toHaveLength(1);
    });
  });

  it("writes event and outbox when registered via event flow", async () => {
    await withRollbackTx(async (tx) => {
      const projection = await registerRepository(tx, {
        name: "demo",
        remoteUrl: "https://github.com/org/demo.git",
      });

      const appendable = createRepositoryRegisteredEvent({
        aggregateType: "repository",
        aggregateId: projection.id,
        eventType: "repository_registered",
        actorId: SYSTEM_ACTOR_ID,
        version: projection.version,
        occurredAt: projection.createdAt,
        payload: repositoryRegisteredPayload({
          id: projection.id,
          name: projection.name,
          remoteUrl: projection.remoteUrl,
          isExternal: projection.isExternal,
        }),
      });
      const { eventId } = await appendEvent(tx, appendable);
      await writeOutbox(tx, { ...appendable, eventId });

      const eventRows = await tx
        .select()
        .from(events)
        .where(eq(events.aggregateId, projection.id));
      expect(eventRows).toHaveLength(1);
      expect(eventRows[0]?.eventType).toBe("repository_registered");

      const outboxRows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, projection.id));
      expect(outboxRows).toHaveLength(1);
    });
  });
});
