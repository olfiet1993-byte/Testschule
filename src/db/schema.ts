import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

const id = () => text("id").primaryKey().$defaultFn(() => nanoid(12));
const ts = (name: string) =>
  integer(name, { mode: "timestamp" }).$defaultFn(() => new Date());

export const schools = sqliteTable("schools", {
  id: id(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  role: text("role", { enum: ["teacher", "student", "admin"] }).notNull(),
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

export const yearGroups = sqliteTable("year_groups", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  position: integer("position").notNull().default(1),
});

export const classes = sqliteTable("classes", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  yearGroupId: text("year_group_id").references(() => yearGroups.id),
  teacherId: text("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  color: text("color").notNull().default("#3b82f6"),
  createdAt: ts("created_at").notNull(),
});

export const classMembers = sqliteTable(
  "class_members",
  {
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: ts("joined_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.userId] })],
);

export const groups = sqliteTable("groups", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#10b981"),
  createdAt: ts("created_at").notNull(),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

export const topics = sqliteTable("topics", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: ts("created_at").notNull(),
});

export const contentItems = sqliteTable("content_items", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  type: text("type", {
    enum: ["text", "image", "link", "term", "video", "file"],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  url: text("url"),
  imagePath: text("image_path"),
  tags: text("tags"),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  authorId: text("author_id").notNull().references(() => users.id),
  type: text("type", {
    enum: ["quiz", "flashcards", "image_hotspot", "matching", "ordering", "cloze", "open", "case_study"],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  payload: text("payload").notNull(),
  xpReward: integer("xp_reward").notNull().default(10),
  dueAt: ts("due_at"),
  publishedAt: ts("published_at"),
  examMode: integer("exam_mode", { mode: "boolean" }).notNull().default(false),
  timeLimitMinutes: integer("time_limit_minutes"),
  answersRevealedAt: ts("answers_revealed_at"),
  difficulty: integer("difficulty"), // 1=leicht, 2=mittel, 3=schwer (null = unbestimmt)
  // Lehrplan-Verknüpfung + schulinternes Teilen
  curriculumUnitId: text("curriculum_unit_id"),
  sharedInSchool: integer("shared_in_school", { mode: "boolean" }).notNull().default(false),
  clonedFromTaskId: text("cloned_from_task_id"),
  createdAt: ts("created_at").notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: id(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answer: text("answer"),
  scorePct: real("score_pct"),
  xpEarned: integer("xp_earned").notNull().default(0),
  submittedAt: ts("submitted_at").notNull(),
});

export const badges = sqliteTable("badges", {
  id: id(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("🏅"),
});

export const userBadges = sqliteTable(
  "user_badges",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id),
    earnedAt: ts("earned_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

export const auditLog = sqliteTable("audit_log", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(), // schnapshot, auch wenn User gelöscht
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const studentNotes = sqliteTable("student_notes", {
  id: id(),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const classTeachers = sqliteTable(
  "class_teachers",
  {
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    addedAt: ts("added_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.userId] })],
);

export const scheduleSlots = sqliteTable("schedule_slots", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 0=Mo, 1=Di, ..., 4=Fr, 5=Sa, 6=So
  startTime: text("start_time").notNull(), // "HH:MM"
  endTime: text("end_time"),
  title: text("title").notNull(),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  location: text("location"),
  createdAt: ts("created_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["task_published", "new_message", "new_answer", "answer_accepted", "live_quiz_started"],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  readAt: ts("read_at"),
  createdAt: ts("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: ts("read_at"),
  createdAt: ts("created_at").notNull(),
});

export const teacherInvites = sqliteTable("teacher_invites", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  invitedByUserId: text("invited_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  acceptedAt: ts("accepted_at"),
  createdAt: ts("created_at").notNull(),
  expiresAt: ts("expires_at").notNull(),
});

export const questions = sqliteTable("questions", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at").notNull(),
});

export const answers = sqliteTable("answers", {
  id: id(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isAccepted: integer("is_accepted", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at").notNull(),
});

// ============ Nutzungs-Tracking (für Admin-Übersicht) ============

export const usageDays = sqliteTable(
  "usage_days",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(), // "YYYY-MM-DD" lokal
    minutes: integer("minutes").notNull().default(0),
    pings: integer("pings").notNull().default(0),
    lastPingAt: ts("last_ping_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

// ============ Lehrplan (Curriculum) ============

export const curriculumUnits = sqliteTable("curriculum_units", {
  id: id(),
  // null = global (für alle Schulen); sonst schul-spezifisch
  schoolId: text("school_id").references(() => schools.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  code: text("code"),         // z. B. "I.1.a"
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: ts("created_at").notNull(),
});

// ============ Spaced Repetition (Karteikarten-Trainer) ============

export const flashcardDecks = sqliteTable("flashcard_decks", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  source: text("source", { enum: ["manual", "auto_task", "auto_content"] }).notNull().default("manual"),
  sourceTaskId: text("source_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: ts("created_at").notNull(),
});

export const flashcards = sqliteTable("flashcards", {
  id: id(),
  deckId: text("deck_id").notNull().references(() => flashcardDecks.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  hint: text("hint"),
  position: integer("position").notNull().default(0),
  createdAt: ts("created_at").notNull(),
});

export const cardReviews = sqliteTable(
  "card_reviews",
  {
    cardId: text("card_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ease: real("ease").notNull().default(2.5),
    interval: integer("interval").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: ts("due_at").notNull(),
    lastReviewedAt: ts("last_reviewed_at"),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.userId] })],
);

// ============ Vitalwerte-Simulator (Lehrer-Szenarien) ============

export const vitalScenarios = sqliteTable("vital_scenarios", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  patientName: text("patient_name").notNull(),
  age: integer("age").notNull(),
  context: text("context").notNull(),
  // JSON-encoded payload mit vitals, abnormal[], correctActions[], distractorActions[], diagnosis
  payload: text("payload").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: ts("created_at").notNull(),
});

// ============ Fehlerbuch ============

export const mistakes = sqliteTable("mistakes", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  questionIndex: integer("question_index"),
  note: text("note"),
  capturedAt: ts("captured_at").notNull(),
  resolvedAt: ts("resolved_at"),
});

export const feedback = sqliteTable("feedback", {
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

export const feedbackVotes = sqliteTable(
  "feedback_votes",
  {
    feedbackId: text("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.feedbackId, t.userId] })],
);

export const learningPaths = sqliteTable("learning_paths", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topics.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  startsOn: text("starts_on").notNull(), // "YYYY-MM-DD" (Montag der ersten Woche)
  numWeeks: integer("num_weeks").notNull(),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: ts("created_at").notNull(),
});

export const learningPathItems = sqliteTable("learning_path_items", {
  id: id(),
  pathId: text("path_id").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
  weekIndex: integer("week_index").notNull(), // 1..numWeeks
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  note: text("note"),
  createdAt: ts("created_at").notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  memberships: many(classMembers),
  submissions: many(submissions),
  badges: many(userBadges),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, { fields: [classes.teacherId], references: [users.id] }),
  yearGroup: one(yearGroups, { fields: [classes.yearGroupId], references: [yearGroups.id] }),
  members: many(classMembers),
  groups: many(groups),
  topics: many(topics),
  tasks: many(tasks),
}));

export type Question = typeof questions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Submission = typeof submissions.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// Token-Log & Analytics (DSGVO-konform)
// ─────────────────────────────────────────────────────────────────────────────

export const tokenLog = sqliteTable("token_log", {
  id:           text("id").primaryKey().$defaultFn(() => nanoid(12)),
  createdAt:    integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  teacherId:    text("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  callType:     text("call_type").notNull(),
  model:        text("model").notNull(),
  inputTokens:  integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costMicroEur: integer("cost_micro_eur").notNull().default(0),
  classId:      text("class_id").references(() => classes.id, { onDelete: "set null" }),
  durationMs:   integer("duration_ms"),
  // KEIN: prompt_text, response_text, student_ids (DSGVO Art. 5 lit. c)
});

export const dailyStats = sqliteTable("daily_stats", {
  statDate:            text("stat_date").primaryKey(),
  activeTeachers:      integer("active_teachers").notNull().default(0),
  activeStudentsCount: integer("active_students_count").notNull().default(0),
  tasksCreated:        integer("tasks_created").notNull().default(0),
  tasksPublished:      integer("tasks_published").notNull().default(0),
  submissionsCount:    integer("submissions_count").notNull().default(0),
  aiCallsCount:        integer("ai_calls_count").notNull().default(0),
  aiInputTokens:       integer("ai_input_tokens").notNull().default(0),
  aiOutputTokens:      integer("ai_output_tokens").notNull().default(0),
  aiCostMicroEur:      integer("ai_cost_micro_eur").notNull().default(0),
  avgScorePercent:     real("avg_score_percent"),
  createdAt:           integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const learningPredictions = sqliteTable("learning_predictions", {
  id:           text("id").primaryKey().$defaultFn(() => nanoid(12)),
  generatedAt:  integer("generated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  expiresAt:    integer("expires_at", { mode: "timestamp" }).notNull(),
  classId:      text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  studentHash:  text("student_hash").notNull(),
  topic:        text("topic").notNull(),
  masteryScore: real("mastery_score").notNull(),
  riskLevel:    text("risk_level", { enum: ["ok", "watch", "critical"] }).notNull(),
  scoreQuiz:    real("score_quiz"),
  scoreSm2:     real("score_sm2"),
  scoreError:   real("score_error"),
  scoreSubmit:  real("score_submit"),
});
