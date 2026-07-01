import { mysqlTable, int, varchar, tinyint, timestamp, decimal, text, mysqlEnum } from 'drizzle-orm/mysql-core';

export const accounts = mysqlTable('accounts', {
  id:         int('id').autoincrement().primaryKey(),
  store_name: varchar('store_name', { length: 150 }).notNull().unique(), // doubles as the login username
  nom_de_store: varchar('nom_de_store', { length: 150 }).notNull().unique(),
  password:   varchar('password', { length: 255 }).notNull(),
  role:       mysqlEnum('role', ['master', 'store']).default('store').notNull(),
  active:     tinyint('active').default(1).notNull(),
  must_change_password: tinyint('must_change_password').default(0).notNull(), // ponytail: kept for schema stability; the master now sets the password directly, so this is always 0
  created_at: timestamp('created_at').defaultNow(),
});

export const participants = mysqlTable('participants', {
  id:           int('id').autoincrement().primaryKey(),
  account_id:   int('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  full_name:    varchar('full_name', { length: 255 }).notNull(),
  commercial_nom:    varchar('commercial_nom', { length: 100 }),    // the commercial (salesperson) who filed this submission
  commercial_prenom: varchar('commercial_prenom', { length: 100 }),
  nom:          varchar('nom', { length: 100 }),   // the client
  prenom:       varchar('prenom', { length: 100 }),
  phone:        varchar('phone', { length: 30 }).notNull(),
  wilaya:       varchar('wilaya', { length: 100 }).notNull(),
  is_painter:   tinyint('is_painter').default(0).notNull(),
  password:     varchar('password', { length: 255 }).default('').notNull(),
  status:       mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending').notNull(),
  created_at:   timestamp('created_at').defaultNow(),
  updated_at:   timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const invoices = mysqlTable('invoices', {
  id:               int('id').autoincrement().primaryKey(),
  participant_id:   int('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  filename:         varchar('filename', { length: 255 }).notNull(),
  original_name:    varchar('original_name', { length: 255 }).notNull(),
  declared_amount:  decimal('declared_amount', { precision: 12, scale: 2 }),   // montant entered by the commercial; auto-approves if it matches the AI-read amount
  amount_detected:  decimal('amount_detected', { precision: 12, scale: 2 }),
  gemini_response:  text('gemini_response'),
  file_hash:        varchar('file_hash', { length: 64 }),        // #6 SHA-256 of raw bytes
  perceptual_hash:  varchar('perceptual_hash', { length: 16 }),  // #7 64-bit dHash (hex)
  content_key:      varchar('content_key', { length: 255 }),     // #8 vendor|invoice_no|date|amount
  duplicate_flag:   tinyint('duplicate_flag').default(0).notNull(), // 1 = needs admin review (soft dup)
  status:           mysqlEnum('status', ['pending', 'accepted', 'rejected']).default('pending').notNull(),
  attempt:          int('attempt').default(1),
  uploaded_at:      timestamp('uploaded_at').defaultNow(),
});

// Append-only audit trail. Every mutating admin action (and system auto-approval)
// writes one row; only the master can read it, so even the master's own actions
// are recorded here.
export const auditLogs = mysqlTable('audit_logs', {
  id:               int('id').autoincrement().primaryKey(),
  actor_account_id: int('actor_account_id'),                    // null = system (background auto-approve)
  actor_name:       varchar('actor_name', { length: 150 }),     // snapshot of who acted (store_name)
  actor_role:       varchar('actor_role', { length: 20 }),
  action:           varchar('action', { length: 80 }).notNull(),
  detail:           varchar('detail', { length: 255 }),
  created_at:       timestamp('created_at').defaultNow(),
});

// Inferred types — use these everywhere instead of hand-writing interfaces
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;