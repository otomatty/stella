-- 殿堂 (Hall of Fame / Phase 5) の廃止。
--
-- 殿堂の行 (推薦・記入中の下書き・公開済みのストーリー) をテーブルごと落とす。
-- 他の表から参照されていない (外部キーは tenants / profiles へ向くだけ) ので、
-- これ 1 つを落とせば済む。索引 (hall_of_fame_user_uq / hall_of_fame_status_idx) は
-- テーブルと一緒に消える。通知は殿堂から出していなかったので消すものはない。
-- 監査ログの hof_* の行は消さない (ラベルは DEPRECATED_LABELS に残してある)。
DROP TABLE IF EXISTS `hall_of_fame_entries`;
