ALTER TABLE `tasks` ADD `exam_mode` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `time_limit_minutes` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `answers_revealed_at` integer;