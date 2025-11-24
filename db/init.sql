CREATE TABLE IF NOT EXISTS surveys (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  site_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  questions JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_site_active (site_id, is_active),
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  survey_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  site_id VARCHAR(128) NOT NULL,
  answers JSON NOT NULL,
  user_agent VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_survey (survey_id),
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS survey_views (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  survey_id VARCHAR(36) NOT NULL,
  site_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_survey (survey_id)
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  password_salt VARCHAR(64) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
