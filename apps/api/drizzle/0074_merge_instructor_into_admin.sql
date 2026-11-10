-- 講師ロールを廃止する。残っている行は管理者にする。
-- 本番に該当行は無い。seed 済みのローカル DB と取りこぼしのため。
UPDATE profiles SET role = 'admin' WHERE role = 'instructor';
