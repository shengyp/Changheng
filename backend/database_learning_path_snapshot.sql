SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS qb_learning_path_snapshot (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  stage VARCHAR(32) NOT NULL,
  goal VARCHAR(64) NOT NULL,
  days INT NOT NULL DEFAULT 14,
  title VARCHAR(255) NULL,
  summary_text VARCHAR(1000) NULL,
  snapshot_json LONGTEXT NOT NULL,
  snapshot_hash VARCHAR(128) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_learning_path_snapshot_user (user_id, created_at, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
