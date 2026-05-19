CREATE TABLE `teacher_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_invites_token_unique` ON `teacher_invites` (`token`);