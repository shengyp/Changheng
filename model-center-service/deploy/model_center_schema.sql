CREATE TABLE IF NOT EXISTS `models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_category` enum('api','local_llm','detection') COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_type` enum('api','ollama','transformers','fealearner','emoji') COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_key` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_base_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `config_template` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ollama_model_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ollama_base_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT 'http://localhost:11434',
  `model_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lora_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detection_type` enum('fealearner','emoji') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `embedding_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supported_datasets` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT '1',
  `is_default` tinyint(1) DEFAULT '0',
  `is_builtin` tinyint(1) DEFAULT '0',
  `performance_metrics` json DEFAULT NULL,
  `status` enum('active','inactive','error') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` datetime DEFAULT NULL,
  `usage_count` int DEFAULT '0',
  `avg_processing_time_ms` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `temperature` float DEFAULT '0.7',
  `max_tokens` int DEFAULT '2048',
  `top_p` float DEFAULT '0.9',
  `timeout` int DEFAULT '120',
  PRIMARY KEY (`id`),
  UNIQUE KEY `model_code` (`model_code`),
  KEY `idx_model_category` (`model_category`),
  KEY `idx_model_type` (`model_type`),
  KEY `idx_provider` (`provider`),
  KEY `idx_detection_type` (`detection_type`),
  KEY `idx_is_available` (`is_available`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `prompt_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `prompt_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `variables` json DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `usage_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_template_name_task` (`name`, `task_type`),
  KEY `idx_name` (`name`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_model_id` (`model_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `prompt_templates_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `models` (
  model_name, model_code, model_category, model_type, provider, api_base_url,
  config_template, ollama_model_name, ollama_base_url, description, version,
  is_available, is_default, is_builtin, status, supported_datasets
) VALUES
  ('DashScope Qwen Flash', 'qwen-flash', 'api', 'api', 'dashscope', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'dashscope', NULL, NULL, 'DashScope qwen-flash API model.', 'v1.0', 1, 0, 1, 'inactive', JSON_ARRAY('reddit')),
  ('DeepSeek V3', 'deepseek-v3', 'api', 'api', 'deepseek', 'https://api.deepseek.com/v1', 'deepseek', NULL, NULL, 'DeepSeek V3 API model.', 'v1.0', 1, 0, 1, 'inactive', JSON_ARRAY('reddit')),
  ('Qwen2 1.5B Local', 'qwen2-1.5b', 'local_llm', 'ollama', 'ollama', NULL, NULL, 'qwen2:1.5b', 'http://localhost:11434', 'Ollama local Qwen model.', 'v2.0', 1, 0, 1, 'active', JSON_ARRAY('reddit')),
  ('Emocc Reddit', 'emocc-reddit', 'detection', 'emoji', 'VIS4SRD', NULL, NULL, NULL, NULL, 'Emoji-based risk detection model.', 'v1.0', 1, 0, 1, 'active', JSON_ARRAY('reddit'))
ON DUPLICATE KEY UPDATE
  model_name = VALUES(model_name),
  description = VALUES(description),
  updated_at = NOW();

INSERT INTO `prompt_templates` (name, task_type, description, prompt_content, is_active, usage_count)
VALUES
  ('Risk Detection Template', 'risk_detection', 'Template for structured risk assessment.', 'Assess the user text carefully and return structured JSON.', 1, 0),
  ('Mistake Explanation Template', 'mistake_explanation', 'Template for study question explanation.', 'Explain this question from knowledge point, solution steps, and common mistakes.', 1, 0)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  prompt_content = VALUES(prompt_content),
  updated_at = NOW();
