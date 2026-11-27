-- 教材の配布 PDF の廃止 (2026-11-26)。生成 PDF の表を落とす。
-- 本番の読み取り (2026-11-26): lesson_materials は source=auto 968 行、source=upload 0 行。
-- lesson_material_versions は 1541 行。どちらの表も lesson-pdf/ 以外の path は 0 件。
-- 公開バケット stella-materials-public の lesson-pdf/ は 3178 オブジェクト、448712191 bytes。
-- R2 はデプロイの retire-lesson-pdfs.ts が migrate の前に lesson-pdf/ だけを片付ける。バケットは消さない。
DROP TABLE IF EXISTS `lesson_material_versions`;
--> statement-breakpoint
DROP TABLE IF EXISTS `lesson_materials`;
