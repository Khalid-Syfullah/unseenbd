CREATE TABLE `curation` (
	`list` text NOT NULL,
	`position` integer NOT NULL,
	`place_slug` text NOT NULL,
	`votes` integer,
	`likes` integer,
	`comments` integer,
	`stars` integer,
	`month` integer,
	PRIMARY KEY(`list`, `position`),
	FOREIGN KEY (`place_slug`) REFERENCES `places`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_stats` (
	`day` text NOT NULL,
	`metric` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `metric`)
);
--> statement-breakpoint
CREATE TABLE `directory` (
	`id` integer PRIMARY KEY NOT NULL,
	`section` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`category_bn` text,
	`area_bn` text,
	`rating` real,
	`reviews` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `directory_section_pos_uq` ON `directory` (`section`,`position`);--> statement-breakpoint
CREATE TABLE `districts` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_bn` text NOT NULL,
	`name_en` text NOT NULL,
	`division` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`famous_for_bn` text NOT NULL,
	`famous_for_en` text NOT NULL,
	`community_photo_count` integer DEFAULT 0 NOT NULL,
	`intro_bn` text,
	`intro_en` text,
	`how_to_reach_bn` text,
	`how_to_reach_en` text,
	FOREIGN KEY (`division`) REFERENCES `divisions`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `districts_slug_uq` ON `districts` (`slug`);--> statement-breakpoint
CREATE INDEX `districts_division_idx` ON `districts` (`division`);--> statement-breakpoint
CREATE TABLE `divisions` (
	`slug` text PRIMARY KEY NOT NULL,
	`name_bn` text NOT NULL,
	`name_en` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guide_suggestions` (
	`id` integer PRIMARY KEY NOT NULL,
	`place_id` integer,
	`district_id` integer,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`name` text,
	`email` text,
	`user_id` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `guide_suggestions_status_idx` ON `guide_suggestions` (`status`);--> statement-breakpoint
CREATE TABLE `kinds` (
	`key` text PRIMARY KEY NOT NULL,
	`label_bn` text NOT NULL,
	`label_en` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leaderboard_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`game` text NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`seed` text,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leaderboard_game_idx` ON `leaderboard_entries` (`game`,`approved`,`score`);--> statement-breakpoint
CREATE TABLE `likes` (
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`actor` text NOT NULL,
	`kind` text DEFAULT 'like' NOT NULL,
	`value` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`target_type`, `target_id`, `actor`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `listing_photos` (
	`listing_id` integer NOT NULL,
	`position` integer NOT NULL,
	`src` text NOT NULL,
	`width` integer,
	`height` integer,
	PRIMARY KEY(`listing_id`, `position`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `listing_prices` (
	`listing_id` integer NOT NULL,
	`position` integer NOT NULL,
	`item` text NOT NULL,
	`amount` integer NOT NULL,
	`unit` text,
	PRIMARY KEY(`listing_id`, `position`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `listing_reviews` (
	`id` integer PRIMARY KEY NOT NULL,
	`listing_id` integer NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `listing_reviews_listing_idx` ON `listing_reviews` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer,
	`kind` text NOT NULL,
	`category` text,
	`size_tier` text NOT NULL,
	`name` text NOT NULL,
	`district_id` integer NOT NULL,
	`area` text,
	`description` text,
	`phone` text,
	`whatsapp` text,
	`social_url` text,
	`contact_name` text,
	`sponsored` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listings_status_idx` ON `listings` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `listings_district_idx` ON `listings` (`district_id`);--> statement-breakpoint
CREATE TABLE `months` (
	`month` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_bn` text NOT NULL,
	`name_en` text NOT NULL,
	`short_en` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `months_slug_unique` ON `months` (`slug`);--> statement-breakpoint
CREATE TABLE `photo_comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`photo_id` integer NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `photo_comments_photo_idx` ON `photo_comments` (`photo_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer,
	`uploader_name` text NOT NULL,
	`uploader_email` text,
	`district_id` integer NOT NULL,
	`place_id` integer,
	`caption` text,
	`src` text NOT NULL,
	`width` integer,
	`height` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `photos_status_idx` ON `photos` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `photos_district_idx` ON `photos` (`district_id`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_bn` text NOT NULL,
	`name_en` text NOT NULL,
	`district_id` integer NOT NULL,
	`district_position` integer DEFAULT 0 NOT NULL,
	`kind` text NOT NULL,
	`popular` integer NOT NULL,
	`unseen` integer NOT NULL,
	`best_from_month` integer NOT NULL,
	`best_to_month` integer NOT NULL,
	`visit_hours` real NOT NULL,
	`lat` real,
	`lng` real,
	`stars` integer NOT NULL,
	`image_credit` text,
	`cover` text,
	`photo` text,
	`nearby` text NOT NULL,
	`from_dhaka` text,
	`description_bn` text,
	`description_en` text,
	`how_to_get_there_bn` text,
	`how_to_get_there_en` text,
	`warnings_bn` text,
	`warnings_en` text,
	`tips_bn` text,
	`tips_en` text,
	`accessibility_bn` text,
	`accessibility_en` text,
	`entry_fee_bn` text,
	`entry_fee_en` text,
	`opening_hours_bn` text,
	`opening_hours_en` text,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kind`) REFERENCES `kinds`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `places_slug_uq` ON `places` (`slug`);--> statement-breakpoint
CREATE INDEX `places_district_idx` ON `places` (`district_id`);--> statement-breakpoint
CREATE INDEX `places_kind_idx` ON `places` (`kind`);--> statement-breakpoint
CREATE TABLE `post_comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_comments_post_idx` ON `post_comments` (`post_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`body` text NOT NULL,
	`photos` text,
	`district_id` integer,
	`place_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`rating_sum` integer DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `posts_status_idx` ON `posts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_user_idx` ON `posts` (`user_id`);--> statement-breakpoint
CREATE TABLE `reference` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`reason` text NOT NULL,
	`reporter` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `routes` (
	`slug` text PRIMARY KEY NOT NULL,
	`from_district_id` integer NOT NULL,
	`to_district_id` integer NOT NULL,
	`road_km` real NOT NULL,
	`bus` text,
	`trains` text NOT NULL,
	`trains_back` text NOT NULL,
	`water_bn` text NOT NULL,
	`water_en` text NOT NULL,
	`flight_bn` text,
	`flight_en` text,
	`places_at_destination` text NOT NULL,
	FOREIGN KEY (`from_district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routes_pair_uq` ON `routes` (`from_district_id`,`to_district_id`);--> statement-breakpoint
CREATE INDEX `routes_to_idx` ON `routes` (`to_district_id`);--> statement-breakpoint
CREATE TABLE `routes_from_dhaka` (
	`to_district_id` integer PRIMARY KEY NOT NULL,
	`road_km` real NOT NULL,
	`bus_hours` text,
	`bus_fare_from_bdt` integer,
	`direct_trains` integer NOT NULL,
	FOREIGN KEY (`to_district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`csrf_token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `short_links` (
	`code` text PRIMARY KEY NOT NULL,
	`district_ids` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` integer PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`district_id` integer,
	`body` text,
	`submitter_name` text,
	`user_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`votes` integer DEFAULT 0 NOT NULL,
	`rating_sum` integer DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `suggestions_status_idx` ON `suggestions` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `train_fares` (
	`train_slug` text NOT NULL,
	`position` integer NOT NULL,
	`from_station` text NOT NULL,
	`to_station` text NOT NULL,
	`cls` text NOT NULL,
	`fare` integer NOT NULL,
	PRIMARY KEY(`train_slug`, `position`),
	FOREIGN KEY (`train_slug`) REFERENCES `trains`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `train_stops` (
	`train_slug` text NOT NULL,
	`position` integer NOT NULL,
	`station_bn` text NOT NULL,
	`station_en` text NOT NULL,
	`district_id` integer,
	`arr` text,
	`dep` text,
	`minutes` integer,
	PRIMARY KEY(`train_slug`, `position`),
	FOREIGN KEY (`train_slug`) REFERENCES `trains`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `train_stops_district_idx` ON `train_stops` (`district_id`);--> statement-breakpoint
CREATE TABLE `trains` (
	`slug` text PRIMARY KEY NOT NULL,
	`no` integer NOT NULL,
	`name_bn` text NOT NULL,
	`name_en` text NOT NULL,
	`off_day` integer,
	`from_bn` text NOT NULL,
	`from_en` text NOT NULL,
	`from_district_id` integer NOT NULL,
	`to_bn` text NOT NULL,
	`to_en` text NOT NULL,
	`to_district_id` integer NOT NULL,
	`dep` text NOT NULL,
	`arr` text NOT NULL,
	`minutes` integer NOT NULL,
	`classes` text,
	`timetable` text,
	`confidence` text NOT NULL,
	`as_of` text NOT NULL,
	`sources` text NOT NULL,
	`return_train` text,
	FOREIGN KEY (`from_district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trains_no_uq` ON `trains` (`no`);--> statement-breakpoint
CREATE TABLE `trend_comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`place_id` integer NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `trend_comments_place_idx` ON `trend_comments` (`place_id`);--> statement-breakpoint
CREATE TABLE `trend_votes` (
	`place_id` integer NOT NULL,
	`season` text NOT NULL,
	`voter` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`place_id`, `season`, `voter`),
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`input` text NOT NULL,
	`plan` text,
	`total_cost` integer,
	`is_public` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trips_user_idx` ON `trips` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text,
	`password_hash` text,
	`google_sub` text,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`avatar` text,
	`role` text DEFAULT 'user' NOT NULL,
	`story` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_uq` ON `users` (`handle`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_uq` ON `users` (`google_sub`);--> statement-breakpoint
CREATE TABLE `view_history` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`place_id` integer,
	`district_id` integer,
	`viewed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `view_history_user_idx` ON `view_history` (`user_id`,`viewed_at`);--> statement-breakpoint
CREATE TABLE `visited` (
	`user_id` integer NOT NULL,
	`district_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `district_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wishlist` (
	`user_id` integer NOT NULL,
	`place_id` integer NOT NULL,
	`status` text DEFAULT 'want' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `place_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
