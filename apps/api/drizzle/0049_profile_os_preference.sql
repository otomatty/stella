-- 教材の OS 別ブロック (07 §11) で既定に開く OS。null は端末から推定する。
ALTER TABLE profiles ADD COLUMN os_preference text CHECK (os_preference IN ('windows', 'macos'));
