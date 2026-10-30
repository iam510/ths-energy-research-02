CREATE TABLE `research_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`revision` integer NOT NULL,
	`evidence_json` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_revision` ON `research_versions` (`workspace_id`,`revision`);