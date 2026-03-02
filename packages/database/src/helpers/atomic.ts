import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Atomically increment a column value
 * @param column - The column to increment
 * @param amount - The amount to increment by (default: 1)
 * @returns SQL expression for atomic increment
 */
export function atomicIncrement(column: AnyPgColumn, amount = 1): any {
  return sql`${column} + ${amount}`;
}

/**
 * Atomically decrement a column value
 * @param column - The column to decrement
 * @param amount - The amount to decrement by (default: 1)
 * @returns SQL expression for atomic decrement
 */
export function atomicDecrement(column: AnyPgColumn, amount = 1): any {
  return sql`${column} - ${amount}`;
}

/**
 * Atomically decrement a column value with floor at 0
 * @param column - The column to decrement
 * @param amount - The amount to decrement by (default: 1)
 * @returns SQL expression for safe atomic decrement with GREATEST(0, ...)
 */
export function safeDecrement(column: AnyPgColumn, amount = 1): any {
  return sql`GREATEST(0, ${column} - ${amount})`;
}
