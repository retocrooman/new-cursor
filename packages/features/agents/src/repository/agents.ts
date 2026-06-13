import {
  agentLabels,
  agents,
  type DbOrTx,
  eq,
  inArray,
  labels,
} from "@new-cursor/db";
import { defineDomainError } from "@new-cursor/errors";
import { BaseRepository } from "@new-cursor/repository-kit";

import {
  type AgentProjection,
  type AgentRow,
  toAgentProjection,
} from "../model/projection";

export const AgentFeatureError = defineDomainError("Agent", "agents-feature");

class AgentsRepository extends BaseRepository<AgentRow, AgentProjection> {
  protected override readonly table = agents;
  protected override readonly errors = AgentFeatureError;
  protected override readonly defaultSort = {
    column: agents.createdAt,
    direction: "desc" as const,
  };
  protected override readonly sortableFields = {
    createdAt: agents.createdAt,
    updatedAt: agents.updatedAt,
    name: agents.name,
  };
  protected override readonly searchableColumns = [
    agents.name,
    agents.description,
  ];

  protected toProjection(row: AgentRow): AgentProjection {
    return toAgentProjection(row, []);
  }

  protected override async loadProjection(
    tx: DbOrTx,
    row: AgentRow,
  ): Promise<AgentProjection> {
    const labelRows = await tx
      .select({ id: labels.id, name: labels.name })
      .from(agentLabels)
      .innerJoin(labels, eq(agentLabels.labelId, labels.id))
      .where(eq(agentLabels.agentId, row.id));

    return toAgentProjection(row, labelRows);
  }
}

const agentsRepository = new AgentsRepository();

async function findOrCreateLabels(
  tx: DbOrTx,
  labelNames: string[],
): Promise<Array<{ id: string; name: string }>> {
  const uniqueNames = [
    ...new Set(labelNames.map((n) => n.trim()).filter(Boolean)),
  ];
  if (uniqueNames.length === 0) {
    return [];
  }

  const existing = await tx
    .select({ id: labels.id, name: labels.name })
    .from(labels)
    .where(inArray(labels.name, uniqueNames));

  const existingNames = new Set(existing.map((l) => l.name));
  const toCreate = uniqueNames.filter((name) => !existingNames.has(name));
  const now = new Date();

  const created =
    toCreate.length > 0
      ? await tx
          .insert(labels)
          .values(
            toCreate.map((name) => ({
              name,
              createdAt: now,
              updatedAt: now,
              version: 1,
            })),
          )
          .returning({ id: labels.id, name: labels.name })
      : [];

  return [...existing, ...created].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createAgent(
  tx: DbOrTx,
  input: {
    name: string;
    description?: string | null;
    labels?: string[];
  },
): Promise<AgentProjection> {
  const now = new Date();
  const [row] = await tx
    .insert(agents)
    .values({
      name: input.name,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    .returning();

  if (!row) {
    throw AgentFeatureError.insertFailed();
  }

  const labelRows = await findOrCreateLabels(tx, input.labels ?? []);
  if (labelRows.length > 0) {
    await tx.insert(agentLabels).values(
      labelRows.map((label) => ({
        agentId: row.id,
        labelId: label.id,
      })),
    );
  }

  return toAgentProjection(row as AgentRow, labelRows);
}

export async function findAgentById(
  tx: DbOrTx,
  id: string,
): Promise<AgentProjection | null> {
  return agentsRepository.findById(tx, id);
}

export async function listAgents(
  tx: DbOrTx,
  opts?: Parameters<typeof agentsRepository.list>[1],
) {
  const result = await agentsRepository.list(tx, opts);
  const rows = await Promise.all(
    result.rows.map(async (row) => {
      const full = await findAgentById(tx, row.id);
      return full ?? row;
    }),
  );
  return { rows, total: result.total };
}
