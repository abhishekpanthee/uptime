import { pgTable, serial, varchar, timestamp, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Table: Users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 38 }).notNull(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Table: Ownership
export const ownership = pgTable('ownership', {
  website_url: varchar('website_url', { length: 254 }).primaryKey(),
  owner_id: integer('owner_id').references(() => users.id).notNull(),
  is_public: boolean('is_public').notNull().default(false),
});

// Table: Analytics
export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  website_url: varchar('website_url', { length: 254 }).references(() => ownership.website_url).notNull(),
  ping5: integer('ping5'), // Response time in ms
  checked_at: timestamp('checked_at').defaultNow(),
});

// Table: Average Hour
export const averageHour = pgTable('average_hour', {
  website_url: varchar('website_url', { length: 254 }).notNull().references(() => ownership.website_url),
  hour_id: varchar('hour_id', { length: 10 }).notNull(), // Format: YYYYMMDDHH
  avg: integer('avg').notNull(),
  sample_count: integer('sample_count').notNull(),
  checked_at: timestamp('checked_at').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.website_url, t.hour_id] }),
}));

// Table: Average Day
export const averageDay = pgTable('average_day', {
  website_url: varchar('website_url', { length: 254 }).notNull().references(() => ownership.website_url),
  day_id: varchar('day_id', { length: 8 }).notNull(), // Format: YYYYMMDD
  avg: integer('avg').notNull(),
  sample_count: integer('sample_count').notNull(),
  checked_at: timestamp('checked_at').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.website_url, t.day_id] }),
}));

// Table: Refresh Tokens
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 380 }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  revoked_at: timestamp('revoked_at'),
});

// Table: Password Reset Tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  used_at: timestamp('used_at'),
});