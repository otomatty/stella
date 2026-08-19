-- contract リリース (issue #141): #137 の expand リリースで意図的に残した旧割当
-- ["PHP/JS"] を ["PHP","JS"] へ書き換える。 複数タグと併記された行も replace で一括対応。
-- 旧 API (isAssignableCategory が旧リスト) は既に居ないため、 書き換えても壊れる読者は無い。
-- 適用後は `select count(*) from interview_prep_assignments where categories like '%PHP/JS%'`
-- が 0 になる (新タグに "PHP/JS" という値は存在しない)。
UPDATE `interview_prep_assignments` SET `categories` = replace(`categories`, '"PHP/JS"', '"PHP","JS"');
