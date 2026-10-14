import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'news_scripts' table to store user's history and state.
export const newsScripts = pgTable('news_scripts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  originalInput: text('original_input'),
  scriptType: text('script_type').notNull(), // e.g. 'draft', 'proofread', 'report'
  createdAt: timestamp('created_at').defaultNow(),
  hashtags: text('hashtags'), // SEO hashtags
});

// Define the 'news_feedbacks' table to store feedback on generated content.
export const newsFeedbacks = pgTable('news_feedbacks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  rating: text('rating').notNull(), // 'good' or 'bad'
  originalText: text('original_text'), // snapshot of text they liked/disliked
  comment: text('comment'),
  wrongWord: text('wrong_word'),
  correctedWord: text('corrected_word'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'user_corrections' table for personal translation dictionary overrides.
export const userCorrections = pgTable('user_corrections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  originalWord: text('original_word').notNull(),
  correctedWord: text('corrected_word').notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'global_vocabulary' table for Super Admin Burmese news dictionary translations.
export const globalVocabulary = pgTable('global_vocabulary', {
  id: serial('id').primaryKey(),
  englishWord: text('english_word').notNull(),
  burmeseTranslation: text('burmese_translation').notNull(),
  partOfSpeech: text('part_of_speech'), // e.g., 'Noun', 'Verb', 'Abbreviation'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  addedBy: integer('added_by')
    .references(() => users.id, { onDelete: 'set null' }),
});

// Relations setup.
export const usersRelations = relations(users, ({ many }) => ({
  newsScripts: many(newsScripts),
  feedbacks: many(newsFeedbacks),
  corrections: many(userCorrections),
}));

export const newsScriptsRelations = relations(newsScripts, ({ one }) => ({
  user: one(users, {
    fields: [newsScripts.userId],
    references: [users.id],
  }),
}));

export const newsFeedbacksRelations = relations(newsFeedbacks, ({ one }) => ({
  user: one(users, {
    fields: [newsFeedbacks.userId],
    references: [users.id],
  }),
}));

export const userCorrectionsRelations = relations(userCorrections, ({ one }) => ({
  user: one(users, {
    fields: [userCorrections.userId],
    references: [users.id],
  }),
}));

export const globalVocabularyRelations = relations(globalVocabulary, ({ one }) => ({
  user: one(users, {
    fields: [globalVocabulary.addedBy],
    references: [users.id],
  }),
}));

