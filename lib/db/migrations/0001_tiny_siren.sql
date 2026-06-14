ALTER TABLE `participants` MODIFY COLUMN `password` varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `invoices` ADD `file_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `invoices` ADD `perceptual_hash` varchar(16);--> statement-breakpoint
ALTER TABLE `invoices` ADD `content_key` varchar(255);--> statement-breakpoint
ALTER TABLE `invoices` ADD `duplicate_flag` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_invoices_file_hash` ON `invoices` (`file_hash`);--> statement-breakpoint
CREATE INDEX `idx_invoices_content_key` ON `invoices` (`content_key`);