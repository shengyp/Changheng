-- Upgrade existing smart learning resource table for teacher agent resource generation.
-- Run once on databases created before the teacher agent resource enhancement.

ALTER TABLE qb_learning_resource
  ADD COLUMN content LONGTEXT NULL AFTER summary,
  ADD COLUMN personalization_basis JSON NULL AFTER content,
  ADD COLUMN review_report_json JSON NULL AFTER personalization_basis,
  ADD COLUMN model_source_json JSON NULL AFTER review_report_json,
  ADD COLUMN audit_status VARCHAR(40) NOT NULL DEFAULT 'manual' AFTER model_source_json;

CREATE INDEX idx_resource_audit_status ON qb_learning_resource(audit_status);
