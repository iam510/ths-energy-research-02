CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`day` text NOT NULL,
	`task` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`source_ids` text NOT NULL,
	`status` text NOT NULL,
	`usage_json` text,
	`error_code` text,
	`created_at` text NOT NULL,
	`duration_ms` integer
);
--> statement-breakpoint
CREATE INDEX `ai_day` ON `ai_runs` (`day`);--> statement-breakpoint
CREATE INDEX `ai_workspace_day` ON `ai_runs` (`workspace_id`,`day`);