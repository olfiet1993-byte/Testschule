/**
 * Postgres-Variante des DB-Schemas (für Cloud-Deployment).
 *
 * Wechsel im Code:
 * - `from "@/db/schema"` → `from "@/db/postgres/schema-pg"`
 * - `from "drizzle-orm/better-sqlite3"` → `from "drizzle-orm/postgres-js"` (oder node-postgres)
 *
 * Daten-Migration: siehe scripts/migrate-to-postgres.ts
 */

import {
  pgTable, text, integer, boolean, real, timestamp, primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

const id = () => text("id").primaryKey().$defaultFn(() => nanoid(12));
const ts = (name: string) =>
  timestamp(name, { withTimezone: true }).$defaultFn(() => new Date());

export const schools = pgTable("schools", {
  id: id(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const users = pgTable("users", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  role: text("role").notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  pinHash: text("pin_hash"),
  avatarUrl: text("avatar_url"),
  avatarEmoji: text("avatar_emoji"),
  avatarColor: text("avatar_color"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveAt: ts("last_active_at"),
  createdAt: ts("created_at").notNull(),
});

export const yearGroups = pgTable("year_groups", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  position: integer("position").notNull().default(1),
});

export const classes = pgTable("classes", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  yearGroupId: text("year_group_id").references(() => yearGroups.id),
  teacherId: text("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  color: text("color").notNull().default("#3b82f6"),
  createdAt: ts("created_at").notNull(),
});

export const classMembers = pgTable(
  "class_members",
  {
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: ts("joined_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.userId] })],
);

export const classTeachers = pgTable(
  "class_teachers",
  {
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    addedAt: ts("added_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.userId] })],
);

export const groups = pgTable("groups", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#10b981"),
  createdAt: ts("created_at").notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

export const topics = pgTable("topics", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: ts("created_at").notNull(),
});

export const contentItems = pgTable("content_items", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  url: text("url"),
  imagePath: text("image_path"),
  tags: text("tags"),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  authorId: text("author_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  payload: text("payload").notNull(),
  xpReward: integer("xp_reward").notNull().default(10),
  dueAt: ts("due_at"),
  publishedAt: ts("published_at"),
  examMode: boolean("exam_mode").notNull().default(false),
  timeLimitMinutes: integer("time_limit_minutes"),
  answersRevealedAt: ts("answers_revealed_at"),
  difficulty: integer("difficulty"),
  createdAt: ts("created_at").notNull(),
});

export const submissions = pgTable("submissions", {
  id: id(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answer: text("answer"),
  scorePct: real("score_pct"),
  xpEarned: integer("xp_earned").notNull().default(0),
  submittedAt: ts("submitted_at").notNull(),
});

export const badges = pgTable("badges", {
  id: id(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("🏅"),
});

export const userBadges = pgTable(
  "user_badges",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id),
    earnedAt: ts("earned_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

export const auditLog = pgTable("audit_log", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const scheduleSlots = pgTable("schedule_slots", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  title: text("title").notNull(),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  location: text("location"),
  createdAt: ts("created_at").notNull(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  readAt: ts("read_at"),
  createdAt: ts("created_at").notNull(),
});

export const messages = pgTable("messages", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: ts("read_at"),
  createdAt: ts("created_at").notNull(),
});

export const teacherInvites = pgTable("teacher_invites", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  invitedByUserId: text("invited_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  acceptedAt: ts("accepted_at"),
  createdAt: ts("created_at").notNull(),
  expiresAt: ts("expires_at").notNull(),
});

export const questions = pgTable("questions", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: ts("created_at").notNull(),
});

export const answers = pgTable("answers", {
  id: id(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isAccepted: boolean("is_accepted").notNull().default(false),
  createdAt: ts("created_at").notNull(),
});

export const learningPaths = pgTable("learning_paths", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  startsOn: text("starts_on").notNull(),
  numWeeks: integer("num_weeks").notNull(),
  archived: boolean("archived").notNull().default(false),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: ts("created_at").notNull(),
});

export const learningPathItems = pgTable("learning_path_items", {
  id: id(),
  pathId: text("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
  weekIndex: integer("week_index").notNull(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  note: text("note"),
  createdAt: ts("created_at").notNull(),
});

export const feedback = pgTable("feedback", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["idea", "bug", "question", "other"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["open", "planned", "in_progress", "done", "wontfix"] }).notNull().default("open"),
  response: text("response"),
  respondedBy: text("responded_by").references(() => users.id, { onDelete: "set null" }),
  respondedAt: ts("responded_at"),
  createdAt: ts("created_at").notNull(),
});

export const feedbackVotes = pgTable(
  "feedback_votes",
  {
    feedbackId: text("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.feedbackId, t.userId] })],
);
