-- Migration 0021: KI-Klassifikation für Feedback
ALTER TABLE `feedback` ADD COLUMN `ai_classification` text;
-- 'bug' | 'feature' | 'noise'
ALTER TABLE `feedback` ADD COLUMN `ai_confidence` real;
ALTER TABLE `feedback` ADD COLUMN `ai_reasoning` text;
ALTER TABLE `feedback` ADD COLUMN `agent_task_id` text REFERENCES `agent_tasks`(`id`) ON DELETE SET NULL;
ALTER TABLE `feedback` ADD COLUMN `admin_approved` integer DEFAULT 0;
-- 0 = nicht bewertet, 1 = bestätigt, -1 = abgelehnt
