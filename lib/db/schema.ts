import { mysqlTable, int, varchar, tinyint, timestamp, decimal, text, mysqlEnum } from 'drizzle-orm/mysql-core';

export const participants = mysqlTable('participants', {
  id:           int('id').autoincrement().primaryKey(),
  full_name:    varchar('full_name', { length: 255 }).notNull(),
  phone:        varchar('phone', { length: 30 }).notNull().unique(),
  wilaya:       varchar('wilaya', { length: 100 }).notNull(),
  is_painter:   tinyint('is_painter').default(0).notNull(),
password: varchar('password', { length: 255 }).default('').notNull(),
  status:       mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending').notNull(),
  created_at:   timestamp('created_at').defaultNow(),
  updated_at:   timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const invoices = mysqlTable('invoices', {
  id:               int('id').autoincrement().primaryKey(),
  participant_id:   int('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  filename:         varchar('filename', { length: 255 }).notNull(),
  original_name:    varchar('original_name', { length: 255 }).notNull(),
  amount_detected:  decimal('amount_detected', { precision: 12, scale: 2 }),
  gemini_response:  text('gemini_response'),
  status:           mysqlEnum('status', ['pending', 'accepted', 'rejected']).default('pending').notNull(),
  attempt:          int('attempt').default(1),
  uploaded_at:      timestamp('uploaded_at').defaultNow(),
});

export const admins = mysqlTable('admins', {
  id:         int('id').autoincrement().primaryKey(),
  username:   varchar('username', { length: 100 }).notNull().unique(),
  password:   varchar('password', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Inferred types — use these everywhere instead of hand-writing interfaces
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type Admin = typeof admins.$inferSelect;