CREATE TABLE `world_marks` (
	`user_id` integer NOT NULL,
	`country` text NOT NULL,
	`mark` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `country`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `story_times` text;--> statement-breakpoint
ALTER TABLE `users` ADD `locale` text;--> statement-breakpoint
ALTER TABLE `users` ADD `theme` text;--> statement-breakpoint
ALTER TABLE `users` ADD `public_map` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` text;