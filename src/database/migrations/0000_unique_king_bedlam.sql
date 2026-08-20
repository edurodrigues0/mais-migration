CREATE TABLE `canonical_staging` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`kind` text NOT NULL,
	`external_id` text NOT NULL,
	`source_system` text NOT NULL,
	`payload_json` text NOT NULL,
	`warnings_json` text NOT NULL,
	`imported` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `migration_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `migration_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`status` text NOT NULL,
	`connection_json` text NOT NULL,
	`stages_json` text NOT NULL,
	`counters_json` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `migration_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`status` text NOT NULL,
	`counters_json` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`summary` text NOT NULL,
	`errors_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `migration_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
