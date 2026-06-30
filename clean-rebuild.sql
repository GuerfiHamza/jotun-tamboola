-- =====================================================================
-- jotun_tamboola — clean database rebuild
-- Drops all tables and recreates them fresh (two-tier accounts model).
-- WARNING: this DELETES all existing data.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `participants`;
DROP TABLE IF EXISTS `accounts`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `__drizzle_migrations`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- accounts  (master + store accounts; store_name doubles as username)
-- ---------------------------------------------------------------------
CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nom_de_store` varchar(150) NOT NULL,
	`store_name` varchar(150) NOT NULL,
	`password` varchar(255) NOT NULL,
	`role` enum('master','store') NOT NULL DEFAULT 'store',
	`active` tinyint NOT NULL DEFAULT 1,
	`must_change_password` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_store_name_unique` UNIQUE(`store_name`)
);

-- ---------------------------------------------------------------------
-- participants  (each submission belongs to one store account)
-- ---------------------------------------------------------------------
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
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

-- ---------------------------------------------------------------------
-- invoices  (includes dedup columns: file_hash, perceptual_hash,
--            content_key, duplicate_flag)
-- ---------------------------------------------------------------------
CREATE TABLE `invoices` (
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

ALTER TABLE `participants`
	ADD CONSTRAINT `participants_account_id_accounts_id_fk`
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`)
	ON DELETE cascade ON UPDATE no action;

ALTER TABLE `invoices`
	ADD CONSTRAINT `invoices_participant_id_participants_id_fk`
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`)
	ON DELETE cascade ON UPDATE no action;

CREATE INDEX `idx_participants_account_id` ON `participants` (`account_id`);
CREATE INDEX `idx_invoices_file_hash` ON `invoices` (`file_hash`);
CREATE INDEX `idx_invoices_content_key` ON `invoices` (`content_key`);

-- Master account seed. Login: MASTER / ChangeMe!2026 — CHANGE THIS PASSWORD.
INSERT INTO `accounts` (`store_name`, `password`, `role`, `active`, `must_change_password`)
VALUES ('MASTER', '$2b$12$y.77vj2HDD1CKEjZ7Kryl.JVINd50ruCQJi4ztTdKTqdOl9MZhO1i', 'master', 1, 0);
