import { type DbOrTx, eq, labels, rules } from "@new-cursor/db";
import { defineDomainError } from "@new-cursor/errors";
import { BaseRepository } from "@new-cursor/repository-kit";

import {
  type RuleProjection,
  type RuleRow,
  toRuleProjection,
} from "../model/projection";

export const RuleFeatureError = defineDomainError("Rule", "rules-feature");

class RulesRepository extends BaseRepository<
  RuleRow,
  RuleProjection,
  "labelId"
> {
  protected override readonly table = rules;
  protected override readonly errors = RuleFeatureError;
  protected override readonly defaultSort = {
    column: rules.createdAt,
    direction: "desc" as const,
  };
  protected override readonly sortableFields = {
    createdAt: rules.createdAt,
    updatedAt: rules.updatedAt,
  };
  protected override readonly filterableFields = ["labelId"] as const;
  protected override readonly searchableColumns = [rules.content];

  protected toProjection(row: RuleRow): RuleProjection {
    return toRuleProjection(row);
  }
}

const rulesRepository = new RulesRepository();

async function assertLabelExists(tx: DbOrTx, labelId: string): Promise<void> {
  const rows = await tx
    .select({ id: labels.id })
    .from(labels)
    .where(eq(labels.id, labelId));
  if (rows.length === 0) {
    throw RuleFeatureError.notFound(labelId);
  }
}

export async function createRule(
  tx: DbOrTx,
  input: {
    labelId: string;
    content: string;
  },
): Promise<RuleProjection> {
  await assertLabelExists(tx, input.labelId);

  const now = new Date();
  const [row] = await tx
    .insert(rules)
    .values({
      labelId: input.labelId,
      content: input.content,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })
    .returning();

  if (!row) {
    throw RuleFeatureError.insertFailed();
  }

  return toRuleProjection(row as RuleRow);
}

export async function findRuleById(
  tx: DbOrTx,
  id: string,
): Promise<RuleProjection | null> {
  return rulesRepository.findById(tx, id);
}

export async function listRules(
  tx: DbOrTx,
  opts?: Parameters<typeof rulesRepository.list>[1],
) {
  return rulesRepository.list(tx, opts);
}
