CREATE TABLE `admin_log` (
	`id` integer PRIMARY KEY NOT NULL,
	`admin_id` integer,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`ids` text NOT NULL,
	`detail` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `admin_log_created_idx` ON `admin_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `place_stars` (
	`place_id` integer PRIMARY KEY NOT NULL,
	`stars` integer NOT NULL,
	`original` integer NOT NULL,
	`updated_by` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `listing_photos` ADD `thumb` text;