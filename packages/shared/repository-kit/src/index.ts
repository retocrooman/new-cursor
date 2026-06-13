import {
  and,
  asc,
  type DbOrTx,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
  type SQL,
  sql,
} from "@new-cursor/db";
import type {
  CustomError,
  ReferenceGuardErrorFactory,
} from "@new-cursor/errors";
import type { Column } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * BaseRepository が前提とする最小の監査カラム。
 * Drizzle の `$inferSelect` がこの形を含んでいれば BaseRepository を使える。
 *
 * `deletedAt` は softDelete を提供しない aggregate でカラム自体を持たないため optional。
 */
export type AuditableRow = {
  id: string;
  version: number;
  deletedAt?: Date | null;
  updatedAt: Date;
};

/**
 * BaseRepository が利用する domain error の最小契約。
 * `defineDomainError(...)` の戻り値そのままで満たせる。
 */
export type RepositoryErrors = {
  notFound: (id: string) => CustomError;
  versionMismatch: (
    id: string,
    expected: number,
    actual: number,
  ) => CustomError;
  alreadyDeleted: (id: string) => CustomError;
  notDeleted: (id: string) => CustomError;
};

export type SortDirection = "asc" | "desc";

export type FilterValue = string | number | boolean | Date | null | undefined;

/**
 * filter 1 件分の入力値。
 * - スカラー（`FilterValue`）→ `eq(column, value)`
 * - 配列（`readonly FilterValue[]`）→ `inArray(column, [...])`（multi-select）。
 *   空配列は「制約なし（= 全件）」として扱いスキップする。
 */
export type FilterInput = FilterValue | readonly FilterValue[];

export type ListOptions<TFilterField extends string = never> = {
  /** 論理削除済みも含めるか（既定: false）。 */
  includeDeleted?: boolean;
  /**
   * 論理削除済み「だけ」に絞るか（既定: false）。`true` のとき `deletedAt IS NOT NULL`
   * を強制し、`includeDeleted` の値より優先する（「無効化済みのみ」表示などで使う）。
   * soft delete を持たない aggregate では無視される。
   */
  deletedOnly?: boolean;
  /** 自由文字列検索。`searchableColumns` を ILIKE で OR 結合。 */
  search?: string;
  /** ホワイトリストされた filter フィールドの集合。値が配列なら IN (...) になる。 */
  filters?: Partial<Record<TFilterField, FilterInput>>;
  /** ソート指定。`field` は `sortableFields` のキー。 */
  sort?: { field: string; direction?: SortDirection };
  /** 取得件数。既定 50。 */
  limit?: number;
  /** 取得開始位置。既定 0。 */
  offset?: number;
};

export type ListResult<TProjection> = {
  rows: TProjection[];
  total: number;
};

/**
 * Soft delete 前に評価する参照ガード 1 件分の宣言。
 *
 * Repository サブクラスで `protected override readonly referenceGuards = [...]` を
 * 並べると、基底の `softDeleteWithVersion` が version 検証 + 既削除チェックを通った後で
 * 各 guard を順に評価し、`countQuery` が 1 件以上を返したものがあれば
 * `errorFactory({ id, count })` を即 throw する。
 *
 * `errorFactory` は `@new-cursor/errors` の `defineReferenceGuardError(...)` で生成した
 * factory がそのまま渡せる shape にしてある。
 */
export type ReferenceGuardConfig = {
  readonly errorFactory: ReferenceGuardErrorFactory;
  readonly countQuery: (tx: DbOrTx, id: string) => Promise<number>;
};

/**
 * BaseRepository が扱える projection テーブルの最小型。
 * `id` / `version` / `updatedAt` を `Column` として持つことだけを要求する。
 */
export type SoftDeletableTable = PgTable & {
  id: Column;
  version: Column;
  updatedAt: Column;
  deletedAt?: Column;
};

/**
 * `Repository = ORM の利用ポリシー層` という位置付けで、各 feature の repository が
 * 共有する責務（findById / findByIdOrThrow / softDeleteWithVersion /
 * restoreWithVersion / count 付き list）をまとめる。
 *
 * 個別 feature では `table` / `toProjection` / `errors` / sort & filter の
 * ホワイトリストだけを宣言し、独自メソッドが必要な場合のみ追加する。
 */
export abstract class BaseRepository<
  TRow extends AuditableRow,
  TProjection,
  TFilterField extends string = never,
> {
  /** 対象 projection テーブル。 */
  protected abstract readonly table: SoftDeletableTable;
  /** ドメインエラーの factory 集合。`defineDomainError(...)` の戻り値で OK。 */
  protected abstract readonly errors: RepositoryErrors;
  /** Drizzle row → projection への同期変換。副作用なし。 */
  protected abstract toProjection(row: TRow): TProjection;

  /**
   * row → projection への非同期 hook。派生テーブルから attributes を引いて
   * projection を組み立てる必要があるドメインはここを override する。
   * デフォルトは sync の `toProjection` をそのまま呼ぶだけ。
   */
  protected async loadProjection(_tx: DbOrTx, row: TRow): Promise<TProjection> {
    return this.toProjection(row);
  }

  /** filter で受け付ける論理フィールド名のホワイトリスト。 */
  protected readonly filterableFields: readonly TFilterField[] = [];

  /** sort で受け付ける論理フィールド名 → drizzle Column のマップ。 */
  protected readonly sortableFields: Record<string, Column> = {};

  /** 自由検索 (`search`) で ILIKE 対象にするカラム。 */
  protected readonly searchableColumns: readonly Column[] = [];

  /** sort 未指定時に使うフォールバック。サブクラスで必ず宣言する。 */
  protected abstract readonly defaultSort: {
    column: Column;
    direction: SortDirection;
  };

  /**
   * soft delete を提供する aggregate かどうか。
   * `true`（既定）: `deletedAt` カラム必須で soft delete API が有効。
   * `false`: `deletedAt` を持たない aggregate 向け。soft delete API は throw する。
   */
  protected readonly supportsSoftDelete: boolean = true;

  /**
   * `softDeleteWithVersion` が delete 前に評価する参照ガード集合。
   * 既定は空配列。サブクラスで宣言すると version 検証 + 既削除チェックの直後に
   * 各 guard を宣言順で評価し、`countQuery > 0` を返したものがあれば throw する。
   */
  protected readonly referenceGuards: readonly ReferenceGuardConfig[] = [];

  // ---------- Public API ----------

  async findById(tx: DbOrTx, id: string): Promise<TProjection | null> {
    const row = await this.fetchRow(tx, id);
    return row ? this.loadProjection(tx, row) : null;
  }

  async findByIdOrThrow(tx: DbOrTx, id: string): Promise<TProjection> {
    const row = await this.loadRowOrThrow(tx, id);
    return this.loadProjection(tx, row);
  }

  async list(
    tx: DbOrTx,
    opts: ListOptions<TFilterField> = {},
  ): Promise<ListResult<TProjection>> {
    const whereClause = this.buildWhere(opts);
    const orderBy = this.resolveOrderBy(opts.sort);
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    const rows = (await (tx as DbOrTxLike)
      .select()
      .from(this.table)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)) as TRow[];

    const totalRows = (await (tx as DbOrTxLike)
      .select({ value: sql<number>`count(*)::int` })
      .from(this.table)
      .where(whereClause)) as Array<{ value: number }>;

    return {
      rows: rows.map((row) => this.toProjection(row)),
      total: totalRows[0]?.value ?? 0,
    };
  }

  async softDeleteWithVersion(
    tx: DbOrTx,
    id: string,
    expectedVersion: number,
  ): Promise<TProjection> {
    if (!this.supportsSoftDelete) {
      throw new Error(
        `${this.constructor.name}: soft delete is not supported by this aggregate`,
      );
    }
    const current = await this.loadRowOrThrow(tx, id);
    this.assertVersion(id, expectedVersion, current.version);
    if (current.deletedAt) {
      throw this.errors.alreadyDeleted(id);
    }
    for (const guard of this.referenceGuards) {
      const count = await guard.countQuery(tx, id);
      if (count > 0) {
        throw guard.errorFactory({ id, count });
      }
    }
    const row = await this.updateOne(
      tx,
      id,
      { deletedAt: new Date() },
      current.version,
    );
    return this.loadProjection(tx, row);
  }

  async restoreWithVersion(
    tx: DbOrTx,
    id: string,
    expectedVersion: number,
  ): Promise<TProjection> {
    if (!this.supportsSoftDelete) {
      throw new Error(
        `${this.constructor.name}: soft delete is not supported by this aggregate`,
      );
    }
    const current = await this.loadRowOrThrow(tx, id);
    this.assertVersion(id, expectedVersion, current.version);
    if (!current.deletedAt) {
      throw this.errors.notDeleted(id);
    }
    const row = await this.updateOne(
      tx,
      id,
      { deletedAt: null },
      current.version,
    );
    return this.loadProjection(tx, row);
  }

  // ---------- Subclass helpers ----------

  protected async loadRowOrThrow(tx: DbOrTx, id: string): Promise<TRow> {
    const row = await this.fetchRow(tx, id);
    if (!row) throw this.errors.notFound(id);
    return row;
  }

  protected async fetchRow(tx: DbOrTx, id: string): Promise<TRow | undefined> {
    const rows = (await (tx as DbOrTxLike)
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))) as TRow[];
    return rows[0];
  }

  protected assertVersion(id: string, expected: number, actual: number): void {
    if (expected !== actual) {
      throw this.errors.versionMismatch(id, expected, actual);
    }
  }

  /**
   * `id` 指定で 1 行 update し、`updatedAt` / `version` を自動更新する。
   * `patch` は user 提供分のみ。1 行も返らなければ `errors.notFound` を投げる。
   */
  protected async updateOne(
    tx: DbOrTx,
    id: string,
    patch: Record<string, unknown>,
    currentVersion: number,
  ): Promise<TRow> {
    const updated = (await (tx as DbOrTxLike)
      .update(this.table)
      .set({
        ...patch,
        updatedAt: new Date(),
        version: currentVersion + 1,
      })
      .where(eq(this.table.id, id))
      .returning()) as TRow[];
    const row = updated[0];
    if (!row) throw this.errors.notFound(id);
    return row;
  }

  // ---------- WHERE / ORDER BY builders ----------

  protected buildWhere(opts: ListOptions<TFilterField>): SQL | undefined {
    const softDeleteClause = this.buildSoftDeleteClause(opts);
    const conditions = [
      softDeleteClause,
      this.buildSearchClause(opts.search),
      ...this.buildFilters(opts.filters),
    ].filter(isSql);
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * soft delete 状態による WHERE 句を組む。
   * - `deletedOnly` → `deletedAt IS NOT NULL`（最優先）
   * - `includeDeleted` → 制約なし
   * - 既定 → `deletedAt IS NULL`（active のみ）
   * soft delete 非対応 / `deletedAt` カラムなしの場合は undefined。
   */
  protected buildSoftDeleteClause(
    opts: ListOptions<TFilterField>,
  ): SQL | undefined {
    if (!this.supportsSoftDelete || !this.table.deletedAt) return undefined;
    if (opts.deletedOnly) return isNotNull(this.table.deletedAt);
    if (opts.includeDeleted) return undefined;
    return isNull(this.table.deletedAt);
  }

  protected buildSearchClause(search: string | undefined): SQL | undefined {
    if (!search || this.searchableColumns.length === 0) return undefined;
    const pattern = `%${search}%`;
    const clauses = this.searchableColumns.map(
      (col) => sql`${col} ILIKE ${pattern}`,
    );
    if (clauses.length === 1) return clauses[0];
    // drizzle の `or(...)` は OR グループを括弧で囲むため、`buildWhere` の `and(...)`
    // と組み合わせても `(a OR b) AND filter` の優先順位を保てる。`sql.join(..., " OR ")`
    // だと括弧が付かず、AND/OR の優先順位が壊れて filter がすり抜ける。
    return or(...clauses);
  }

  /**
   * filter フィールド → SQL 条件への変換。
   *
   * 既定実装は `filterableFields` の各フィールド名がそのまま table のカラム名に
   * 一致する前提で条件を組む:
   * - スカラー値 → `eq(column, value)`
   * - 配列値 → `inArray(column, [...])`（multi-select の IN フィルタ）。空配列は
   *   「制約なし」としてスキップする。
   *
   * 別演算子が必要なドメインは override する。
   */
  protected buildFilters(
    filters: Partial<Record<TFilterField, FilterInput>> | undefined,
  ): (SQL | undefined)[] {
    if (!filters) return [];
    const out: (SQL | undefined)[] = [];
    for (const field of this.filterableFields) {
      const value = filters[field];
      if (value === undefined || value === null) continue;
      const column = (this.table as unknown as Record<string, Column>)[field];
      if (!column) continue;
      if (Array.isArray(value)) {
        // 空配列は「絞り込みなし（全件）」を意味するのでスキップする。
        if (value.length === 0) continue;
        out.push(inArray(column, [...value] as never[]));
      } else {
        out.push(eq(column, value as never));
      }
    }
    return out;
  }

  protected resolveOrderBy(sort: ListOptions["sort"]): SQL {
    if (sort?.field) {
      const column = this.sortableFields[sort.field];
      if (column) {
        return sort.direction === "desc" ? desc(column) : asc(column);
      }
    }
    return this.defaultSort.direction === "desc"
      ? desc(this.defaultSort.column)
      : asc(this.defaultSort.column);
  }
}

function isSql(value: SQL | undefined): value is SQL {
  return value !== undefined;
}

/**
 * Drizzle の select/update のチェーンを型レベルで完全表現するのは BaseRepository の
 * 責務ではないため、必要最小限のメソッド形だけ持つ shape を内部で型付けして cast する。
 */
type DbOrTxLike = {
  select: (...args: unknown[]) => {
    from: (table: PgTable) => {
      where: (clause?: SQL) => {
        orderBy: (clause: SQL) => {
          limit: (n: number) => {
            offset: (n: number) => Promise<unknown[]>;
          };
        };
      } & Promise<unknown[]>;
    };
  };
  update: (table: PgTable) => {
    set: (values: Record<string, unknown>) => {
      where: (clause?: SQL) => {
        returning: () => Promise<unknown[]>;
      };
    };
  };
};
