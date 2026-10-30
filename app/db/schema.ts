import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const researchVersions=sqliteTable("research_versions",{
 id:text("id").primaryKey(),workspaceId:text("workspace_id").notNull(),revision:integer("revision").notNull(),evidenceJson:text("evidence_json").notNull(),reason:text("reason").notNull(),createdAt:text("created_at").notNull(),
},table=>[uniqueIndex("workspace_revision").on(table.workspaceId,table.revision)]);
