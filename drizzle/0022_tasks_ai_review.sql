-- Migration 0022: KI-Review-Pflicht für generierte Aufgaben
ALTER TABLE `tasks` ADD COLUMN `ai_generated` integer DEFAULT 0;
-- 1 = KI hat diese Aufgabe (ganz oder teilweise) generiert
ALTER TABLE `tasks` ADD COLUMN `reviewed_at` integer;
-- NULL = noch nicht geprüft, Timestamp = Zeitpunkt der Freigabe durch Lehrkraft
