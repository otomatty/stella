-- 固定した開始点 (#31) を受け取った時点で、開始点が実装を含むと教材が示していた前の課題
-- (課題 ID の JSON 配列)。受け取ったあとのそれらの課題の提出も支援付きにする。教材があとで
-- 変わっても、受講者に見せた中身の記録として受け取りの行に残す。この列より前の記録は null。
ALTER TABLE task_fixed_start_uses ADD COLUMN covered_task_ids text;
