CREATE TABLE `vital_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`topic_id` text,
	`patient_name` text NOT NULL,
	`age` integer NOT NULL,
	`context` text NOT NULL,
	`payload` text NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
