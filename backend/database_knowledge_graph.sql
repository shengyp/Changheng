-- Knowledge graph relation table.
-- Use this script only when an existing database is missing qb_knowledge_relation.
-- New deployments can use database_full_init.sql directly.

USE question_bank;

CREATE TABLE IF NOT EXISTS qb_knowledge_relation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_id BIGINT UNSIGNED NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  relation_type VARCHAR(40) NOT NULL DEFAULT 'prerequisite',
  weight DOUBLE NOT NULL DEFAULT 1.0,
  confidence DOUBLE NOT NULL DEFAULT 1.0,
  source_type VARCHAR(40) NOT NULL DEFAULT 'manual',
  description VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_knowledge_relation (source_id, target_id, relation_type),
  KEY idx_knowledge_relation_source (source_id, relation_type, is_deleted),
  KEY idx_knowledge_relation_target (target_id, relation_type, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

