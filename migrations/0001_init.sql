-- Haftalık lider tablosu (opt-in, sadece telefon appi).
-- Her yeni ISO hafta yeni bir satır demek — ayrı bir "sıfırlama" cron'una gerek yok.
-- iso_week her zaman SUNUCU tarafında hesaplanır, client'tan asla güvenilmez.
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  device_id   TEXT NOT NULL,
  iso_week    TEXT NOT NULL,      -- "2026-W38"
  nickname    TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,   -- unix ms
  updated_at  INTEGER NOT NULL,   -- unix ms
  PRIMARY KEY (device_id, iso_week)
);

CREATE INDEX IF NOT EXISTS idx_scores_week_points
  ON leaderboard_scores (iso_week, points DESC);
