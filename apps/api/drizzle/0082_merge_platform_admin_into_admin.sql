-- プラットフォーム管理者ロールを廃止する。残っている行は管理者にする。
UPDATE profiles SET role = 'admin' WHERE role = 'platform_admin';
