-- LLM model center tables for admin-managed system models and student personal models.
-- Use this script when an existing database was initialized before this module existed.

CREATE TABLE IF NOT EXISTS qb_llm_provider (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_key VARCHAR(100) NOT NULL,
  label VARCHAR(128) NOT NULL,
  provider_type VARCHAR(32) NOT NULL DEFAULT 'API',
  base_url VARCHAR(500) NOT NULL,
  api_key_cipher TEXT NULL,
  model VARCHAR(128) NOT NULL,
  temperature DOUBLE NULL,
  supports_temperature TINYINT NOT NULL DEFAULT 1,
  description VARCHAR(1000) NULL,
  tags_json TEXT NULL,
  enabled TINYINT NOT NULL DEFAULT 1,
  is_default TINYINT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_llm_provider_key (provider_key, is_deleted),
  KEY idx_llm_provider_default (is_default, enabled, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qb_prompt_template (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_name VARCHAR(128) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  description VARCHAR(1000) NULL,
  prompt_text LONGTEXT NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_prompt_template_task (task_type, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qb_user_llm_provider (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  provider_key VARCHAR(100) NOT NULL,
  label VARCHAR(128) NOT NULL,
  provider_type VARCHAR(32) NOT NULL DEFAULT 'API',
  base_url VARCHAR(500) NOT NULL,
  api_key_cipher TEXT NULL,
  model VARCHAR(128) NOT NULL,
  temperature DOUBLE NULL,
  supports_temperature TINYINT NOT NULL DEFAULT 1,
  description VARCHAR(1000) NULL,
  tags_json TEXT NULL,
  enabled TINYINT NOT NULL DEFAULT 1,
  is_default TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_user_llm_provider_user (user_id, is_deleted),
  KEY idx_user_llm_provider_key (user_id, provider_key, is_deleted),
  KEY idx_user_llm_provider_default (user_id, is_default, enabled, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qb_user_prompt_template (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  template_name VARCHAR(128) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  description VARCHAR(1000) NULL,
  prompt_text LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_user_prompt_template_user (user_id, is_deleted),
  KEY idx_user_prompt_template_task (user_id, task_type, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
