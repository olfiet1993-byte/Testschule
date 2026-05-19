CREATE TABLE `class_teachers` (
	`class_id` text NOT NULL,
	`user_id` text NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`class_id`, `user_id`),
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
