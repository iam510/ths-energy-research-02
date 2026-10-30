import { integer, sqliteTable, text, uniqueIndex,index } from "drizzle-orm/sqlite-core";
export const researchVersions=sqliteTable("research_versions",{
 id:text("id").primaryKey(),workspaceId:text("workspace_id").notNull(),revision:integer("revision").notNull(),evidenceJson:text("evidence_json").notNull(),reason:text("reason").notNull(),createdAt:text("created_at").notNull(),
},table=>[uniqueIndex("workspace_revision").on(table.workspaceId,table.revision)]);
export const aiRuns=sqliteTable("ai_runs",{
 id:text("id").primaryKey(),workspaceId:text("workspace_id").notNull(),day:text("day").notNull(),task:text("task").notNull(),model:text("model").notNull(),promptVersion:text("prompt_version").notNull(),sourceIds:text("source_ids").notNull(),status:text("status").notNull(),usageJson:text("usage_json"),errorCode:text("error_code"),createdAt:text("created_at").notNull(),durationMs:integer("duration_ms"),
},table=>[index("ai_day").on(table.day),index("ai_workspace_day").on(table.workspaceId,table.day)]);
