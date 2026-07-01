-- =====================================================================
-- jotun_tamboola — migration: commercial fields, declared montant,
-- audit logs, and master-set passwords.
-- Run once against an existing database (idempotent-ish; skip columns
-- that already exist if you re-run).
-- =====================================================================

-- Commercial (salesperson) who filed each submission
ALTER TABLE `participants`
  ADD COLUMN `commercial_nom` varchar(100) NULL AFTER `full_name`,
  ADD COLUMN `commercial_prenom` varchar(100) NULL AFTER `commercial_nom`;

-- Montant entered by the commercial for an invoice (auto-approves on match)
ALTER TABLE `invoices`
  ADD COLUMN `declared_amount` decimal(12,2) NULL AFTER `original_name`;

-- Master now sets store passwords directly — no forced first-login change
ALTER TABLE `accounts`
  ALTER COLUMN `must_change_password` SET DEFAULT 0;
UPDATE `accounts` SET `must_change_password` = 0;

-- Append-only audit trail (master-only read)
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_account_id` int NULL,
	`actor_name` varchar(150) NULL,
	`actor_role` varchar(20) NULL,
	`action` varchar(80) NOT NULL,
	`detail` varchar(255) NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
