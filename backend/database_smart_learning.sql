-- Smart learning module tables.
-- Use this script only when an existing database is missing the smart learning tables.
-- New deployments can use database_full_init.sql directly.

CREATE TABLE IF NOT EXISTS qb_knowledge_point (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(100) NULL,
  parent_id BIGINT NULL,
  tag_id BIGINT NULL,
  level INT NOT NULL DEFAULT 1,
  description VARCHAR(1000) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_kp_parent (parent_id),
  KEY idx_kp_tag (tag_id),
  UNIQUE KEY uk_kp_code (code)
);

CREATE TABLE IF NOT EXISTS qb_learning_resource (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  resource_type VARCHAR(40) NOT NULL DEFAULT 'article',
  url VARCHAR(1000) NULL,
  summary VARCHAR(2000) NULL,
  content LONGTEXT NULL,
  personalization_basis JSON NULL,
  review_report_json JSON NULL,
  model_source_json JSON NULL,
  audit_status VARCHAR(40) NOT NULL DEFAULT 'manual',
  knowledge_point_id BIGINT NULL,
  tag_id BIGINT NULL,
  created_by BIGINT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_resource_kp (knowledge_point_id),
  KEY idx_resource_tag (tag_id),
  KEY idx_resource_audit_status (audit_status)
);


CREATE TABLE IF NOT EXISTS qb_learning_behavior (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  behavior_type VARCHAR(40) NOT NULL,
  ref_id BIGINT NULL,
  knowledge_point_id BIGINT NULL,
  tag_id BIGINT NULL,
  duration_seconds INT NULL,
  note VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_behavior_user_time (user_id, created_at),
  KEY idx_behavior_kp (knowledge_point_id),
  KEY idx_behavior_tag (tag_id)
);

