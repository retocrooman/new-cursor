import {
  agentLabels,
  and,
  type DbOrTx,
  eq,
  inArray,
  isNull,
  labels,
  rules,
} from "@new-cursor/db";

import { type RuleProjection, toRuleProjection } from "../model/projection";

export type ResolvedRulesForAgent = {
  all: RuleProjection[];
  agent: RuleProjection[];
};

export const ALL_LABEL_NAME = "all";

function dedupRulesById(items: RuleProjection[]): RuleProjection[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

async function findRulesForLabelIds(
  tx: DbOrTx,
  labelIds: string[],
): Promise<RuleProjection[]> {
  if (labelIds.length === 0) {
    return [];
  }

  const rows = await tx
    .select({
      id: rules.id,
      labelId: rules.labelId,
      content: rules.content,
      createdAt: rules.createdAt,
      updatedAt: rules.updatedAt,
      deletedAt: rules.deletedAt,
      version: rules.version,
    })
    .from(rules)
    .where(and(inArray(rules.labelId, labelIds), isNull(rules.deletedAt)))
    .orderBy(rules.createdAt);

  return rows.map((row) => toRuleProjection(row));
}

export async function resolveRulesForAgent(
  tx: DbOrTx,
  agentId: string,
): Promise<ResolvedRulesForAgent> {
  const allLabelRows = await tx
    .select({ id: labels.id })
    .from(labels)
    .where(eq(labels.name, ALL_LABEL_NAME))
    .limit(1);
  const allLabelId = allLabelRows[0]?.id;

  const agentLabelRows = await tx
    .select({ id: labels.id, name: labels.name })
    .from(agentLabels)
    .innerJoin(labels, eq(agentLabels.labelId, labels.id))
    .where(eq(agentLabels.agentId, agentId));

  const allRules = allLabelId
    ? await findRulesForLabelIds(tx, [allLabelId])
    : [];

  const agentLabelIds = agentLabelRows
    .filter((label) => label.name !== ALL_LABEL_NAME)
    .map((label) => label.id);

  const agentRules =
    agentLabelIds.length > 0
      ? await findRulesForLabelIds(tx, agentLabelIds)
      : [];

  return {
    all: dedupRulesById(allRules),
    agent: dedupRulesById(agentRules),
  };
}
