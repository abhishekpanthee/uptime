/**
 * Supabase-compatible query builder over the `postgres` (porsager) driver.
 *
 * Provides .from().select().eq().order().limit().single() chains that return
 * { data, error, count? } — same shape the rest of the codebase already uses.
 *
 * Relation queries like select("col, relTable(col2)") are supported via a
 * foreign-key map + sub-queries.
 */

import postgres from "postgres";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const DATABASE_URL = Bun.env.DATABASE_URL;

function getSql() {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable");
  }
  return _sql!;
}

const _sql = DATABASE_URL
  ? postgres(DATABASE_URL, {
      ssl:
        DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
          ? false
          : "require",
      max: 20,
      idle_timeout: 30,
    })
  : null;

export { _sql as sql };

// ---------------------------------------------------------------------------
// FK relationship map  (only needed for relation selects)
// ---------------------------------------------------------------------------

const FK_MAP: Record<
  string,
  Record<string, { localKey: string; foreignKey: string; type: "one" | "many" }>
> = {
  monitor_groups: {
    monitor_group_members: {
      localKey: "id",
      foreignKey: "group_id",
      type: "many",
    },
  },
  org_members: {
    organizations: { localKey: "org_id", foreignKey: "id", type: "one" },
    users: { localKey: "user_id", foreignKey: "id", type: "one" },
  },
  alert_rules: {
    notification_channels: {
      localKey: "channel_id",
      foreignKey: "id",
      type: "one",
    },
  },
  maintenance_monitors: {
    maintenance_windows: {
      localKey: "maintenance_id",
      foreignKey: "id",
      type: "one",
    },
  },
  incident_monitors: {
    incidents: { localKey: "incident_id", foreignKey: "id", type: "one" },
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Condition {
  column: string;
  op: string;
  value: any;
  negate?: boolean;
}

interface Relation {
  table: string;
  columns: string;
  inner: boolean;
}

interface QueryResult<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialize a JS value for a parameterised SQL query. */
function ser(val: any): any {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    // PostgreSQL array literal  e.g.  {"a","b"}
    const items = val.map((v) => {
      if (v === null) return "NULL";
      const s = String(v);
      return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    });
    return `{${items.join(",")}}`;
  }
  if (typeof val === "object") return JSON.stringify(val);
  return val;
}

/** Parse a Supabase-style select string into main columns + relations. */
function parseSelect(raw: string): {
  mainCols: string;
  relations: Relation[];
} {
  const relations: Relation[] = [];
  const re = /,?\s*(\w+)(!inner)?\(([^)]*)\)/g;

  const cleaned = raw
    .replace(re, (_m, table: string, inner: string | undefined, cols: string) => {
      relations.push({ table, columns: cols || "*", inner: !!inner });
      return "";
    })
    .replace(/,\s*$/, "")
    .replace(/^\s*,/, "")
    .trim();

  return { mainCols: cleaned || "*", relations };
}

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

class QueryBuilder implements PromiseLike<QueryResult> {
  private _table: string;
  private _op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private _selectStr = "*";
  private _data: any = null;
  private _upsertConflict = "";
  private _conds: Condition[] = [];
  private _orders: { col: string; asc: boolean }[] = [];
  private _limitN: number | null = null;
  private _rangeStart: number | null = null;
  private _rangeEnd: number | null = null;
  private _single = false;
  private _countExact = false;
  private _returning: string | null = null;

  constructor(table: string) {
    this._table = table;
  }

  // ----- operations --------------------------------------------------------

  select(columns?: string, opts?: { count?: string }): this {
    if (["insert", "update", "upsert", "delete"].includes(this._op)) {
      this._returning = columns || "*";
    } else {
      this._op = "select";
      if (columns) this._selectStr = columns;
    }
    if (opts?.count === "exact") this._countExact = true;
    return this;
  }

  insert(data: any): this {
    this._op = "insert";
    this._data = data;
    return this;
  }

  update(data: any): this {
    this._op = "update";
    this._data = data;
    return this;
  }

  delete(): this {
    this._op = "delete";
    return this;
  }

  upsert(data: any, opts?: { onConflict?: string }): this {
    this._op = "upsert";
    this._data = data;
    this._upsertConflict = opts?.onConflict || "";
    return this;
  }

  // ----- filters -----------------------------------------------------------

  eq(col: string, val: any): this {
    this._conds.push({ column: col, op: "=", value: val });
    return this;
  }
  neq(col: string, val: any): this {
    this._conds.push({ column: col, op: "!=", value: val });
    return this;
  }
  gt(col: string, val: any): this {
    this._conds.push({ column: col, op: ">", value: val });
    return this;
  }
  gte(col: string, val: any): this {
    this._conds.push({ column: col, op: ">=", value: val });
    return this;
  }
  lt(col: string, val: any): this {
    this._conds.push({ column: col, op: "<", value: val });
    return this;
  }
  lte(col: string, val: any): this {
    this._conds.push({ column: col, op: "<=", value: val });
    return this;
  }
  in(col: string, vals: any[]): this {
    this._conds.push({ column: col, op: "IN", value: vals });
    return this;
  }
  is(col: string, val: any): this {
    this._conds.push({
      column: col,
      op: val === null ? "IS NULL" : "IS",
      value: val,
    });
    return this;
  }
  not(col: string, op: string, val: any): this {
    if (op === "is" && val === null) {
      this._conds.push({ column: col, op: "IS NOT NULL", value: null });
    } else {
      this._conds.push({ column: col, op, value: val, negate: true });
    }
    return this;
  }
  like(col: string, pattern: string): this {
    this._conds.push({ column: col, op: "LIKE", value: pattern });
    return this;
  }
  match(obj: Record<string, any>): this {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v);
    return this;
  }

  // ----- modifiers ---------------------------------------------------------

  order(col: string, opts?: { ascending?: boolean }): this {
    this._orders.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number): this {
    this._limitN = n;
    return this;
  }
  range(start: number, end: number): this {
    this._rangeStart = start;
    this._rangeEnd = end;
    return this;
  }
  single(): this {
    this._single = true;
    return this;
  }

  // ----- internal: condition → SQL fragment --------------------------------

  private cond(
    c: Condition,
    idx: number,
    params: any[],
    alias?: string,
  ): { sql: string; next: number } {
    const col = c.column.includes(".")
      ? c.column
          .split(".")
          .map((p) => `"${p}"`)
          .join(".")
      : alias
        ? `"${alias}"."${c.column}"`
        : `"${c.column}"`;

    if (c.op === "IS NULL") return { sql: `${col} IS NULL`, next: idx };
    if (c.op === "IS NOT NULL") return { sql: `${col} IS NOT NULL`, next: idx };

    if (c.op === "IN") {
      const arr: any[] = c.value;
      if (arr.length === 0) return { sql: "FALSE", next: idx };
      const ph = arr.map((_, i) => `$${idx + i}`).join(", ");
      params.push(...arr);
      const clause = c.negate
        ? `${col} NOT IN (${ph})`
        : `${col} IN (${ph})`;
      return { sql: clause, next: idx + arr.length };
    }

    params.push(c.value);
    const op = c.negate ? `NOT ${c.op}` : c.op;
    return { sql: `${col} ${op} $${idx}`, next: idx + 1 };
  }

  /** Build WHERE clause from an array of conditions. */
  private where(
    conds: Condition[],
    idx: number,
    params: any[],
  ): { clause: string; next: number } {
    if (conds.length === 0) return { clause: "", next: idx };
    const parts: string[] = [];
    let n = idx;
    for (const c of conds) {
      const r = this.cond(c, n, params);
      parts.push(r.sql);
      n = r.next;
    }
    return { clause: "WHERE " + parts.join(" AND "), next: n };
  }

  // ----- execution ---------------------------------------------------------

  private async run(): Promise<QueryResult> {
    try {
      switch (this._op) {
        case "select":
          return await this.execSelect();
        case "insert":
          return await this.execInsert();
        case "update":
          return await this.execUpdate();
        case "delete":
          return await this.execDelete();
        case "upsert":
          return await this.execUpsert();
      }
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  // --- SELECT --------------------------------------------------------------

  private async execSelect(): Promise<QueryResult> {
    const { mainCols, relations } = parseSelect(this._selectStr);

    // separate main vs cross-table conditions
    const mainConds = this._conds.filter((c) => !c.column.includes("."));
    const crossConds = this._conds.filter((c) => c.column.includes("."));

    // group cross-table conditions by relation table
    const crossByTable = new Map<string, Condition[]>();
    for (const c of crossConds) {
      const relTable = c.column.split(".")[0];
      if (!crossByTable.has(relTable)) crossByTable.set(relTable, []);
      crossByTable.get(relTable)!.push({
        ...c,
        column: c.column.split(".").slice(1).join("."),
      });
    }

    const params: any[] = [];
    let idx = 1;

    // build main WHERE
    const { clause: mainWhere, next: afterMain } = this.where(
      mainConds,
      idx,
      params,
    );
    idx = afterMain;

    // build EXISTS sub-clauses for inner-join cross-table filters
    const existsParts: string[] = [];
    for (const [relTable, conds] of crossByTable) {
      const fk = FK_MAP[this._table]?.[relTable];
      if (!fk) continue;
      let sub = `EXISTS (SELECT 1 FROM "${relTable}" WHERE "${relTable}"."${fk.foreignKey}" = "${this._table}"."${fk.localKey}"`;
      for (const c of conds) {
        const r = this.cond(c, idx, params, relTable);
        sub += ` AND ${r.sql}`;
        idx = r.next;
      }
      sub += ")";
      existsParts.push(sub);
    }

    // assemble WHERE
    const allParts: string[] = [];
    if (mainWhere) allParts.push(mainWhere.replace(/^WHERE /, ""));
    allParts.push(...existsParts);
    const fullWhere = allParts.length ? "WHERE " + allParts.join(" AND ") : "";

    // ensure FK columns are in SELECT for relation mapping
    let selectCols = mainCols;
    if (relations.length > 0 && mainCols !== "*") {
      const colList = selectCols
        .split(",")
        .map((c) => c.trim().replace(/"/g, ""));
      for (const rel of relations) {
        const fk = FK_MAP[this._table]?.[rel.table];
        if (fk && !colList.includes(fk.localKey)) {
          selectCols += `, "${fk.localKey}"`;
        }
      }
    }

    let q = `SELECT ${selectCols} FROM "${this._table}" ${fullWhere}`;

    if (this._orders.length) {
      q +=
        " ORDER BY " +
        this._orders.map((o) => `"${o.col}" ${o.asc ? "ASC" : "DESC"}`).join(", ");
    }
    if (this._rangeStart !== null && this._rangeEnd !== null) {
      q += ` LIMIT ${this._rangeEnd - this._rangeStart + 1} OFFSET ${this._rangeStart}`;
    } else if (this._limitN !== null) {
      q += ` LIMIT ${this._limitN}`;
    }

    const rows = await getSql().unsafe(q, params);
    const data: any[] = Array.from(rows);

    // optional count
    let count: number | null = null;
    if (this._countExact) {
      const cp: any[] = [];
      const { clause: cw } = this.where(mainConds, 1, cp);
      const cr = await getSql().unsafe(
        `SELECT COUNT(*) AS count FROM "${this._table}" ${cw}`,
        cp,
      );
      count = Number(cr[0]?.count ?? 0);
    }

    // fetch relations via sub-queries
    if (relations.length && data.length) {
      for (const rel of relations) {
        await this.fetchRelation(data, rel, crossByTable.get(rel.table));
      }
    }

    if (this._single) {
      return { data: data[0] ?? null, error: null, count };
    }
    return { data, error: null, count };
  }

  /** Sub-query helper for relation fetching. */
  private async fetchRelation(
    data: any[],
    rel: Relation,
    crossConds?: Condition[],
  ): Promise<void> {
    const fk = FK_MAP[this._table]?.[rel.table];
    if (!fk) return;

    const fkVals = [
      ...new Set(data.map((r) => r[fk.localKey]).filter((v) => v != null)),
    ];
    if (fkVals.length === 0) {
      for (const row of data)
        row[rel.table] = fk.type === "many" ? [] : null;
      return;
    }

    // build SELECT — always include the FK column for mapping
    let selCols: string;
    if (rel.columns === "*") {
      selCols = "*";
    } else {
      const cols = rel.columns.split(",").map((c) => c.trim());
      if (!cols.includes(fk.foreignKey)) cols.unshift(fk.foreignKey);
      selCols = cols.map((c) => `"${c}"`).join(", ");
    }

    const params: any[] = [];
    const ph = fkVals.map((_, i) => `$${i + 1}`).join(", ");
    params.push(...fkVals);
    let idx = fkVals.length + 1;

    let q = `SELECT ${selCols} FROM "${rel.table}" WHERE "${fk.foreignKey}" IN (${ph})`;

    if (crossConds?.length) {
      for (const c of crossConds) {
        const r = this.cond(c, idx, params, rel.table);
        q += ` AND ${r.sql}`;
        idx = r.next;
      }
    }

    const relRows = await getSql().unsafe(q, params);

    if (fk.type === "one") {
      const map = new Map<any, any>();
      for (const r of relRows) map.set(r[fk.foreignKey], r);
      for (const row of data) row[rel.table] = map.get(row[fk.localKey]) ?? null;
    } else {
      const grouped = new Map<any, any[]>();
      for (const r of relRows) {
        const key = r[fk.foreignKey];
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
      }
      for (const row of data)
        row[rel.table] = grouped.get(row[fk.localKey]) ?? [];
    }
  }

  // --- INSERT --------------------------------------------------------------

  private async execInsert(): Promise<QueryResult> {
    const isArr = Array.isArray(this._data);
    const rows: any[] = isArr ? this._data : [this._data];
    if (!rows.length) return { data: null, error: null };

    // filter out undefined values
    const clean = rows.map((r: any) => {
      const o: any = {};
      for (const [k, v] of Object.entries(r)) {
        if (v !== undefined) o[k] = v;
      }
      return o;
    });

    const columns = [...new Set(clean.flatMap((r) => Object.keys(r)))];
    const params: any[] = [];
    let idx = 1;

    const valueSets = clean.map((row) => {
      const ph = columns.map((c) => {
        params.push(ser(row[c] ?? null));
        return `$${idx++}`;
      });
      return `(${ph.join(", ")})`;
    });

    const colStr = columns.map((c) => `"${c}"`).join(", ");
    let q = `INSERT INTO "${this._table}" (${colStr}) VALUES ${valueSets.join(", ")}`;

    if (this._returning) {
      q += ` RETURNING ${this._returning === "*" ? "*" : this._returning.split(",").map((c) => `"${c.trim()}"`).join(", ")}`;
    }

    const result = await getSql().unsafe(q, params);

    if (!this._returning) return { data: null, error: null };
    const data = Array.from(result);
    if (this._single) return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }

  // --- UPDATE --------------------------------------------------------------

  private async execUpdate(): Promise<QueryResult> {
    if (!this._data)
      return { data: null, error: { message: "No data for update" } };

    const entries = Object.entries(this._data).filter(
      ([, v]) => v !== undefined,
    );
    if (!entries.length) return { data: null, error: null };

    const params: any[] = [];
    let idx = 1;

    const sets = entries.map(([col, val]) => {
      params.push(ser(val));
      return `"${col}" = $${idx++}`;
    });

    const { clause: w } = this.where(this._conds, idx, params);

    let q = `UPDATE "${this._table}" SET ${sets.join(", ")} ${w}`;

    if (this._returning) {
      q += ` RETURNING ${this._returning === "*" ? "*" : this._returning.split(",").map((c) => `"${c.trim()}"`).join(", ")}`;
    }

    const result = await getSql().unsafe(q, params);
    if (!this._returning) return { data: null, error: null };
    const data = Array.from(result);
    if (this._single) return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }

  // --- DELETE --------------------------------------------------------------

  private async execDelete(): Promise<QueryResult> {
    const params: any[] = [];
    const { clause: w } = this.where(this._conds, 1, params);
    let q = `DELETE FROM "${this._table}" ${w}`;

    if (this._returning) {
      q += ` RETURNING ${this._returning === "*" ? "*" : this._returning.split(",").map((c) => `"${c.trim()}"`).join(", ")}`;
    }

    const result = await getSql().unsafe(q, params);
    if (!this._returning) return { data: null, error: null };
    const data = Array.from(result);
    if (this._single) return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }

  // --- UPSERT --------------------------------------------------------------

  private async execUpsert(): Promise<QueryResult> {
    const isArr = Array.isArray(this._data);
    const rows: any[] = isArr ? this._data : [this._data];
    if (!rows.length) return { data: null, error: null };

    const columns = Object.keys(rows[0]);
    const params: any[] = [];
    let idx = 1;

    const valueSets = rows.map((row) => {
      const ph = columns.map((c) => {
        params.push(ser(row[c] ?? null));
        return `$${idx++}`;
      });
      return `(${ph.join(", ")})`;
    });

    const colStr = columns.map((c) => `"${c}"`).join(", ");
    const conflictCols = this._upsertConflict
      .split(",")
      .map((c) => `"${c.trim()}"`)
      .join(", ");
    const conflictKeys = this._upsertConflict
      .split(",")
      .map((c) => c.trim());
    const updateCols = columns
      .filter((c) => !conflictKeys.includes(c))
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");

    let q = `INSERT INTO "${this._table}" (${colStr}) VALUES ${valueSets.join(", ")}`;
    q += ` ON CONFLICT (${conflictCols})`;
    q += updateCols ? ` DO UPDATE SET ${updateCols}` : " DO NOTHING";

    if (this._returning) q += " RETURNING *";

    const result = await getSql().unsafe(q, params);
    if (!this._returning) return { data: null, error: null };
    const data = Array.from(result);
    if (this._single) return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }

  // ----- PromiseLike -------------------------------------------------------

  then<T1 = QueryResult, T2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => T1 | PromiseLike<T1>)
      | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const db = {
  from: (table: string) => new QueryBuilder(table),
};

export const supabase = db;

export async function closePgPool(): Promise<void> {
  await getSql().end();
}
