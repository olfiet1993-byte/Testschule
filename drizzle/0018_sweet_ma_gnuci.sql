CREATE TABLE `usage_days` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`pings` integer DEFAULT 0 NOT NULL,
	`last_ping_at` integer,
	PRIMARY KEY(`user_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
