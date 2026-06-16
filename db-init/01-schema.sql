-- jotun_tamboola schema — runs once on first DB init (empty data dir).
-- Matches lib/db/schema.ts: dedup columns on invoices, nom/prenom on
-- participants, phone NOT unique (same number may register multiple times).

CREATE TABLE IF NOT EXISTS `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`password` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_username_unique` UNIQUE(`username`)
);

CREATE TABLE IF NOT EXISTS `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`nom` varchar(100),
	`prenom` varchar(100),
	`phone` varchar(30) NOT NULL,
	`wilaya` varchar(100) NOT NULL,
	`is_painter` tinyint NOT NULL DEFAULT 0,
	`password` varchar(255) NOT NULL DEFAULT '',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participant_id` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`amount_detected` decimal(12,2),
	`gemini_response` text,
	`file_hash` varchar(64),
	`perceptual_hash` varchar(16),
	`content_key` varchar(255),
	`duplicate_flag` tinyint NOT NULL DEFAULT 0,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`attempt` int DEFAULT 1,
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);

ALTER TABLE `invoices`
	ADD CONSTRAINT `invoices_participant_id_participants_id_fk`
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`)
	ON DELETE cascade ON UPDATE no action;

CREATE INDEX `idx_invoices_file_hash` ON `invoices` (`file_hash`);
CREATE INDEX `idx_invoices_content_key` ON `invoices` (`content_key`);