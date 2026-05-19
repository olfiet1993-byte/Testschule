CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`summary` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
