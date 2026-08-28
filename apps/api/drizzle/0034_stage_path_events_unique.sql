-- 学習経路の記録を「1 人 1 ステージ 1 event」に固定する (additive)。
--
-- 0033 の時点では重複の抑止をアプリ側の「読んでから書く」だけで行っていたが、
-- (1) 読みと書きの隙に同じ組が入ると二重に積まれる (割当のやり直しと修了確定が同時に走る)
-- (2) 既存行を引く SELECT が user × stage の直積になり、人数が増えるとバインド上限で落ちる
-- の 2 つが残っていた。DB 側に一意索引を置き、書き込みを insert + do nothing に変える。
--
-- 索引を張るだけなので、0033 まで適用済みの DB にもまっさらな DB にも同じように当たる。
-- 既に重複行がある DB では索引作成そのものが失敗するため、先に重複を畳んでおく
-- (最古の 1 件を残す。`at` は「いつ点いたか」なので、後から来た方を捨てる)。
DELETE FROM `stage_path_events`
WHERE `rowid` NOT IN (
	SELECT MIN(`rowid`) FROM `stage_path_events` GROUP BY `user_id`, `stage_id`, `event`
);--> statement-breakpoint
CREATE UNIQUE INDEX `stage_path_events_user_stage_event_uq` ON `stage_path_events` (`user_id`,`stage_id`,`event`);
