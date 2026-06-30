-- Migration 0020: Agent Task Queue
-- Orchestrator speichert alle Tasks hier — vollständiger Audit-Trail

CREATE TABLE `agent_tasks` (
  `id`            text PRIMARY KEY NOT NULL,
  `created_at`    integer NOT NULL,
  `updated_at`    integer NOT NULL,
  `type`          text NOT NULL,   -- 'bugfix' | 'feature' | 'test' | 'review'
  `status`        text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'in_progress' | 'success' | 'failed' | 'escalated'
  `priority`      integer NOT NULL DEFAULT 5,  -- 1=hoch, 10=niedrig
  `title`         text NOT NULL,
  `description`   text NOT NULL,
  `affected_files` text,           -- JSON Array
  `repro_steps`   text,
  `branch_name`   text,
  `pr_url`        text,
  `result_summary` text,
  `error_log`     text,
  `retries`       integer NOT NULL DEFAULT 0,
  `max_retries`   integer NOT NULL DEFAULT 2,
  `submitted_by`  text,            -- 'orchestrator' | userId
  `token_cost_micro_eur` integer NOT NULL DEFAULT 0
);

CREATE INDEX `agent_tasks_status_idx` ON `agent_tasks` (`status`, `priority`, `created_at`);
