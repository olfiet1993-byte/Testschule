CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`body` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
