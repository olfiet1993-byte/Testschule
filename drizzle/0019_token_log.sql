-- Migration 0019: Token-Log & Lernvorhersage
-- DSGVO-konform: kein Prompt-Inhalt, keine Klarnamen in Analytics

CREATE TABLE `token_log` (
  `id`             text PRIMARY KEY NOT NULL,
  `created_at`     integer NOT NULL,
  `teacher_id`     text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `call_type`      text NOT NULL,
  `model`          text NOT NULL,
  `input_tokens`   integer NOT NULL DEFAULT 0,
  `output_tokens`  integer NOT NULL DEFAULT 0,
  `cost_micro_eur` integer NOT NULL DEFAULT 0,
  `class_id`       text REFERENCES `classes`(`id`) ON DELETE SET NULL,
  `duration_ms`    integer
);

CREATE INDEX `token_log_teacher_idx` ON `token_log` (`teacher_id`, `created_at`);
CREATE INDEX `token_log_created_idx` ON `token_log` (`created_at`);

CREATE TABLE `daily_stats` (
  `stat_date`             text PRIMARY KEY NOT NULL,
  `active_teachers`       integer NOT NULL DEFAULT 0,
  `active_students_count` integer NOT NULL DEFAULT 0,
  `tasks_created`         integer NOT NULL DEFAULT 0,
  `tasks_published`       integer NOT NULL DEFAULT 0,
  `submissions_count`     integer NOT NULL DEFAULT 0,
  `ai_calls_count`        integer NOT NULL DEFAULT 0,
  `ai_input_tokens`       integer NOT NULL DEFAULT 0,
  `ai_output_tokens`      integer NOT NULL DEFAULT 0,
  `ai_cost_micro_eur`     integer NOT NULL DEFAULT 0,
  `avg_score_percent`     real,
  `created_at`            integer NOT NULL
);

CREATE TABLE `learning_predictions` (
  `id`            text PRIMARY KEY NOT NULL,
  `generated_at`  integer NOT NULL,
  `expires_at`    integer NOT NULL,
  `class_id`      text NOT NULL REFERENCES `classes`(`id`) ON DELETE CASCADE,
  `student_hash`  text NOT NULL,
  `topic`         text NOT NULL,
  `mastery_score` real NOT NULL,
  `risk_level`    text NOT NULL,
  `score_quiz`    real,
  `score_sm2`     real,
  `score_error`   real,
  `score_submit`  real
);

CREATE INDEX `predictions_class_idx` ON `learning_predictions` (`class_id`, `expires_at`);
CREATE INDEX `predictions_expires_idx` ON `learning_predictions` (`expires_at`);
