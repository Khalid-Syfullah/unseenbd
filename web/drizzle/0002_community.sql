CREATE TABLE `quota_hits` (
	`day` text NOT NULL,
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `scope`, `key`)
);
--> statement-breakpoint
ALTER TABLE `photo_comments` ADD `ip_hash` text;--> statement-breakpoint
ALTER TABLE `photos` ADD `thumb` text;--> statement-breakpoint
ALTER TABLE `post_comments` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `note` text;--> statement-breakpoint
ALTER TABLE `trend_comments` ADD `season` text;--> statement-breakpoint
ALTER TABLE `trend_comments` ADD `ip_hash` text;