CREATE TABLE IF NOT EXISTS production_daily_summaries (
+  id INT AUTO_INCREMENT PRIMARY KEY,
+  summary_date DATE NOT NULL,
+  production_line_id INT NOT NULL,
+  shift_id INT NULL,
+
+  planned_units INT NOT NULL DEFAULT 0,
+  actual_units INT NOT NULL DEFAULT 0,
+  good_units INT NOT NULL DEFAULT 0,
+  rejected_units INT NOT NULL DEFAULT 0,
+  waste_units DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
+
+  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
+  revenue_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
+
+  raw_material_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
+  labor_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
+  overhead_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
+  other_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
+  total_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
+  gross_profit DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
+
+  downtime_minutes INT NOT NULL DEFAULT 0,
+  notes TEXT NULL,
+  recorded_by INT NULL,
+
+  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
+  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
+
+  CONSTRAINT fk_production_summary_line
+    FOREIGN KEY (production_line_id) REFERENCES production_lines(id)
+    ON UPDATE CASCADE
+    ON DELETE RESTRICT,
+
+  CONSTRAINT fk_production_summary_shift
+    FOREIGN KEY (shift_id) REFERENCES shifts(id)
+    ON UPDATE CASCADE
+    ON DELETE SET NULL,
+
+  CONSTRAINT fk_production_summary_user
+    FOREIGN KEY (recorded_by) REFERENCES users(id)
+    ON UPDATE CASCADE
+    ON DELETE SET NULL,
+
+  CONSTRAINT uq_production_summary_day_line_shift
+    UNIQUE (summary_date, production_line_id, shift_id),
+
+  CONSTRAINT chk_production_summary_counts
+    CHECK (
+      planned_units >= 0 AND
+      actual_units >= 0 AND
+      good_units >= 0 AND
+      rejected_units >= 0 AND
+      downtime_minutes >= 0
+    )
+);
+
+CREATE INDEX idx_production_summary_date
+  ON production_daily_summaries(summary_date);
+
+CREATE INDEX idx_production_summary_line
+  ON production_daily_summaries(production_line_id);
+
+CREATE INDEX idx_production_summary_shift
+  ON production_daily_summaries(shift_id);
+
+CREATE OR REPLACE VIEW director_revenue_overview_vw AS
+SELECT
+  pds.summary_date,
+  pl.id AS production_line_id,
+  pl.name AS production_line_name,
+  s.id AS shift_id,
+  s.name AS shift_name,
+  SUM(pds.planned_units) AS planned_units,
+  SUM(pds.actual_units) AS actual_units,
+  SUM(pds.good_units) AS good_units,
+  SUM(pds.rejected_units) AS rejected_units,
+  SUM(pds.waste_units) AS waste_units,
+  SUM(pds.revenue_amount) AS revenue_amount,
+  SUM(pds.raw_material_cost) AS raw_material_cost,
+  SUM(pds.labor_cost) AS labor_cost,
+  SUM(pds.overhead_cost) AS overhead_cost,
+  SUM(pds.other_cost) AS other_cost,
+  SUM(pds.total_cost) AS total_cost,
+  SUM(pds.gross_profit) AS gross_profit,
+  SUM(pds.downtime_minutes) AS downtime_minutes
+FROM production_daily_summaries pds
+INNER JOIN production_lines pl ON pl.id = pds.production_line_id
+LEFT JOIN shifts s ON s.id = pds.shift_id
+GROUP BY
+  pds.summary_date,
+  pl.id,
+  pl.name,
+  s.id,
+  s.name;
+
+-- Optional starter query for a monthly Director dashboard:
+--
+-- SELECT
+--   DATE_FORMAT(summary_date, '%Y-%m') AS period,
+--   SUM(actual_units) AS total_units,
+--   SUM(revenue_amount) AS total_revenue,
+--   SUM(total_cost) AS total_cost,
+--   SUM(gross_profit) AS total_profit
+-- FROM director_revenue_overview_vw
+-- WHERE summary_date BETWEEN '2026-03-01' AND '2026-03-31'
+-- GROUP BY DATE_FORMAT(summary_date, '%Y-%m');