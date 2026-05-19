CREATE TABLE `curriculum_units` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text,
	`parent_id` text,
	`code` text,
	`title` text NOT NULL,
	`description` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `curriculum_unit_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `shared_in_school` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `cloned_from_task_id` text;