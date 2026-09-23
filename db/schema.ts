import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaceState = sqliteTable("workspace_state", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
  revision: integer("revision").notNull().default(1),
});

export const reviewUsage = sqliteTable("review_usage", {
  date: text("date").primaryKey(),
  used: integer("used").notNull().default(0),
});
