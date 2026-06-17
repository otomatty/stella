-- seed from fixtures (generated)
begin;
insert into public.tenants (id, name, subtitle, icon, active_count) values ('coach', '部活動指導者', '地域スポーツ指導者講習', 'school', 132) on conflict (id) do update set name = excluded.name, subtitle = excluded.subtitle, icon = excluded.icon, active_count = excluded.active_count;
insert into public.tenants (id, name, subtitle, icon, active_count) values ('ses', 'SES未経験エンジニア育成', 'エンジニア研修 / 資格対策', 'cpu', 87) on conflict (id) do update set name = excluded.name, subtitle = excluded.subtitle, icon = excluded.icon, active_count = excluded.active_count;
insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), 'ses', 'web-fundamentals', 'Web開発基礎 — HTML / CSS / JavaScript', 'フロントエンド', 'indigo', 28, '未経験者が3週間で実務レベルのHTML/CSS/JS基礎を身につけるためのコース。ハンズオン中心で、最終課題として簡易ToDoアプリを提出する。', 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();
-- course_ses_web_fundamentals course uuid variable via subselect
delete from public.sections where course_id in (select id from public.courses where tenant_id = 'ses' and slug = 'web-fundamentals');
insert into public.sections (id, course_id, title, "order") select gen_random_uuid(), (select id from public.courses where tenant_id = 'ses' and slug = 'web-fundamentals' limit 1), '01. Webの仕組み', 0;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'HTTPとクライアント/サーバー', 'slides', 0, '12分', null, 'web-fundamentals/01-http.pdf', null, null, 18, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 0;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'DNS・URL・ブラウザレンダリング', 'video', 1, '09:20', 'web-fundamentals/02-dns.mp4', null, null, null, null, 560 from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 0;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '確認テスト（全10問）', 'quiz', 2, '10分', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 0;
insert into public.sections (id, course_id, title, "order") select gen_random_uuid(), (select id from public.courses where tenant_id = 'ses' and slug = 'web-fundamentals' limit 1), '02. HTML / CSS', 1;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'セマンティックHTML', 'video', 0, '15:10', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 1;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'Flexbox と Grid', 'video', 1, '18:30', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 1;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'レスポンシブデザイン', 'text', 2, '8分', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 1;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '課題: ランディングページ模写', 'assignment', 3, '提出', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 1;
insert into public.sections (id, course_id, title, "order") select gen_random_uuid(), (select id from public.courses where tenant_id = 'ses' and slug = 'web-fundamentals' limit 1), '03. JavaScript 基礎', 2;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '変数・型・制御構文', 'video', 0, '22:00', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '配列・オブジェクト', 'video', 1, '17:45', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '関数とスコープ', 'video', 2, '19:30', 'web-fundamentals/10-functions.mp4', null, null, null, null, 1170 from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '【演習】hello を出力', 'code', 3, '5分', null, null, null, 'S0-Ch00-01-print-hello', null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call) values ('S0-Ch00-01-print-hello', 'ses', 'S0', 'Ch00', 'console.log で文字を出す', $d$## やること

`console.log` を使って、画面 (テスト) に **`Hello, World!`** という文字を出してください。

文字列は `"` または `'` で囲みます。

## 期待する出力

```
Hello, World!
```

## ヒント

- 関数呼び出しは `関数名(引数)` の形で書きます
- 文字列の中身は **大文字・小文字・記号もそのまま** 一致させる必要があります
$d$, 'javascript', 'stdout', '[{"path":"main.js","content":"// 文字列を console.log で出力する\n\n"}]'::jsonb, 'main.js', null, '[{"name":"stdout が Hello, World! になる","expectedStdout":"Hello, World!"}]'::jsonb, null, null, '{"eslint":{"rules":{"eqeqeq":"error","no-dupe-keys":"error","no-duplicate-case":"error","no-redeclare":"error","no-undef":"error","no-unreachable":"error","no-var":"error","prefer-const":"warn","use-isnan":"error","valid-typeof":"error"}},"ast":{}}'::jsonb, null, null) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '【演習】変数の表示', 'code', 4, '5分', null, null, null, 'S0-Ch00-06-print-variable', null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call) values ('S0-Ch00-06-print-variable', 'ses', 'S0', 'Ch00', '変数に入れて出す', $d$## やること

`const` を使って **`message` という名前の変数** に `Hello` という文字列を入れ、 その変数を `console.log` で出力してください。

## 期待する出力

```
Hello
```

## ヒント

- `const message = "Hello";` のように書くと、 `message` という箱に `"Hello"` を入れたことになります。
- そのあと `console.log(message)` と書くと、 箱の中身 (= `"Hello"`) が出力されます。
- 文字列を **直接** `console.log` に渡すのではなく、 一度変数に入れてから渡すのが今回のポイントです。
$d$, 'javascript', 'stdout', '[{"path":"main.js","content":"// 1. const で message という変数を作り、\"Hello\" を入れる\n// 2. console.log で message を出力する\n\n"}]'::jsonb, 'main.js', null, '[{"name":"stdout が Hello になる","expectedStdout":"Hello"}]'::jsonb, null, null, '{"eslint":{"rules":{"eqeqeq":"error","no-dupe-keys":"error","no-duplicate-case":"error","no-redeclare":"error","no-undef":"error","no-unreachable":"error","no-var":"error","prefer-const":"warn","use-isnan":"error","valid-typeof":"error"}},"ast":{"required":[{"kind":"const-declaration","name":"message","label":"const message を宣言する"},{"kind":"console-log","argument":{"kind":"identifier","name":"message"},"label":"message 変数を console.log に渡す"}]}}'::jsonb, null, null) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'DOM操作入門', 'video', 5, '16:20', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '非同期処理（Promise / async）', 'text', 6, '12分', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '中間クイズ', 'quiz', 7, '15分', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 2;
insert into public.sections (id, course_id, title, "order") select gen_random_uuid(), (select id from public.courses where tenant_id = 'ses' and slug = 'web-fundamentals' limit 1), '04. 実習課題', 3;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'ToDoアプリ設計書', 'text', 0, '10分', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 3;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'Web IDE: マルチファイル演習', 'code', 1, '提出', null, null, null, 'S0-Ch00-08-multifile-demo', null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 3;
insert into public.assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call) values ('S0-Ch00-08-multifile-demo', 'ses', 'S0', 'Ch00', '多ファイル UI のデモ (採点は main.js のみ)', $d$## やること

エディタ上部のタブで `main.js` と `utils.js` を切り替えられることを確認し、 `main.js` だけを編集して
出力を **`Hello multi-file`** にしてください。

このデモでは:

- **採点対象は `main.js` のみ** です ( `entryFile` )
- `utils.js` は読み取り専用で、 多ファイル UI の表示確認用です
- ファイル間の `import` (モジュール解決) は将来対応予定 (#100)

## 期待する出力

```
Hello multi-file
```
$d$, 'javascript', 'stdout', '[{"path":"main.js","content":"// 採点対象は main.js だけです。 utils.js は読み取り専用 (デモ用) です。\n// console.log で \"Hello multi-file\" を出してみましょう。\n\n"},{"path":"utils.js","content":"// このタブは多ファイル UI の表示確認用です。\n// 現状ではファイル間の import (モジュール解決) はまだ未対応で、 採点は main.js のみが対象です。\n// 将来は ESM の import / export を解決して採点する予定 (#100)。\n\nexport const demoNote = \"multi-file scaffold\";\n","readonly":true}]'::jsonb, 'main.js', null, '[{"name":"stdout が Hello multi-file になる","expectedStdout":"Hello multi-file"}]'::jsonb, null, null, '{"eslint":{"rules":{"eqeqeq":"error","no-dupe-keys":"error","no-duplicate-case":"error","no-redeclare":"error","no-undef":"error","no-unreachable":"error","no-var":"error","prefer-const":"warn","use-isnan":"error","valid-typeof":"error"}},"ast":{}}'::jsonb, null, null) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, '最終課題レビュー', 'assignment', 2, '提出', null, null, null, null, null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 3;
insert into public.sections (id, course_id, title, "order") select gen_random_uuid(), (select id from public.courses where tenant_id = 'ses' and slug = 'web-fundamentals' limit 1), '05. データベース入門 (SQL)', 4;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'SELECT 文の基礎', 'code', 0, '5分', null, null, null, 'S0-Sql-Ch00-01-select-hello', null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 4;
insert into public.assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call) values ('S0-Sql-Ch00-01-select-hello', 'ses', 'S0', 'Ch00', 'SQL: 数値を SELECT する', $d$## やること

採点ランナは事前に次の SQL を流しています:

```sql
CREATE TABLE t(x INT);
INSERT INTO t VALUES (1), (2), (3);
```

`query.sql` に **`t.x` を昇順で取り出す SELECT 文** を 1 つ書いてください。

ターミナルタブで `SELECT * FROM t;` 等を試して動作を確かめられます (採点 DB とは独立)。

## 期待される結果

| x |
|---|
| 1 |
| 2 |
| 3 |
$d$, 'sql', 'sql', '[{"path":"query.sql","content":"-- テーブル t には x=1, 2, 3 が入っています。\n-- x を昇順で全件取り出す SELECT 文を書いてください。\n\n"}]'::jsonb, 'query.sql', null, '[{"name":"x を昇順で 3 件返す","expectedColumns":["x"],"expectedRows":[[1],[2],[3]]}]'::jsonb, $d$CREATE TABLE t(x INT); INSERT INTO t VALUES (1), (2), (3);$d$, null, '{"eslint":{"rules":{"eqeqeq":"error","no-dupe-keys":"error","no-duplicate-case":"error","no-redeclare":"error","no-undef":"error","no-unreachable":"error","no-var":"error","prefer-const":"warn","use-isnan":"error","valid-typeof":"error"}},"ast":{}}'::jsonb, null, null) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'WHERE 句で絞り込み', 'code', 1, '7分', null, null, null, 'S0-Sql-Ch00-02-where-filter', null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 4;
insert into public.assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call) values ('S0-Sql-Ch00-02-where-filter', 'ses', 'S0', 'Ch00', 'SQL: WHERE で条件を絞る', $d$## やること

採点ランナは事前に次の SQL を流しています:

```sql
CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
INSERT INTO users(name, age) VALUES ('alice', 17), ('bob', 21), ('carol', 30), ('dave', 16);
```

`query.sql` に **`age >= 18` の `name` を昇順で取り出す SELECT 文** を書いてください。

## 期待される結果

| name  |
|-------|
| bob   |
| carol |
$d$, 'sql', 'sql', '[{"path":"query.sql","content":"-- users テーブルから age が 18 以上の name を昇順で取り出してください。\n\n"}]'::jsonb, 'query.sql', null, '[{"name":"age >= 18 の name を昇順で返す","expectedColumns":["name"],"expectedRows":[["bob"],["carol"]]}]'::jsonb, $d$CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
INSERT INTO users(name, age) VALUES ('alice', 17), ('bob', 21), ('carol', 30), ('dave', 16);$d$, null, '{"eslint":{"rules":{"eqeqeq":"error","no-dupe-keys":"error","no-duplicate-case":"error","no-redeclare":"error","no-undef":"error","no-unreachable":"error","no-var":"error","prefer-const":"warn","use-isnan":"error","valid-typeof":"error"}},"ast":{}}'::jsonb, null, null) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;
insert into public.lessons (section_id, title, type, "order", duration_label, video_path, pdf_path, markdown, assignment_id, total_pages, total_sec) select s.id, 'GROUP BY で集計', 'code', 2, '10分', null, null, null, 'S0-Sql-Ch00-03-group-by', null, null from public.sections s join public.courses c on c.id = s.course_id where c.tenant_id = 'ses' and c.slug = 'web-fundamentals' and s."order" = 4;
insert into public.assignments (id, tenant_id, stage, chapter_id, title, description, language, test_kind, starter_files, entry_file, entry_points, tests, sql_seed, lint_preset, static_analysis, mutation, demo_call) values ('S0-Sql-Ch00-03-group-by', 'ses', 'S0', 'Ch00', 'SQL: GROUP BY で集計する', $d$## やること

採点ランナは事前に次の SQL を流しています:

```sql
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
INSERT INTO orders(customer, amount) VALUES
  ('alice', 100), ('alice', 200), ('alice', 50),
  ('bob', 300), ('bob', 150),
  ('carol', 80);
```

`query.sql` で **customer ごとの件数 (`COUNT(*)` を `cnt` という別名で)** を、 customer 昇順で出力してください。

## 期待される結果

| customer | cnt |
|----------|-----|
| alice    | 3   |
| bob      | 2   |
| carol    | 1   |
$d$, 'sql', 'sql', '[{"path":"query.sql","content":"-- orders を customer ごとに集計し、 customer と件数を customer 昇順で取り出してください。\n-- 期待される列: customer, cnt (それぞれ orders.customer / 件数)\n\n"}]'::jsonb, 'query.sql', null, '[{"name":"customer ごとの件数を昇順で返す","expectedColumns":["customer","cnt"],"expectedRows":[["alice",3],["bob",2],["carol",1]]}]'::jsonb, $d$CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
INSERT INTO orders(customer, amount) VALUES
  ('alice', 100), ('alice', 200), ('alice', 50),
  ('bob', 300), ('bob', 150),
  ('carol', 80);$d$, null, '{"eslint":{"rules":{"eqeqeq":"error","no-dupe-keys":"error","no-duplicate-case":"error","no-redeclare":"error","no-undef":"error","no-unreachable":"error","no-var":"error","prefer-const":"warn","use-isnan":"error","valid-typeof":"error"}},"ast":{}}'::jsonb, null, null) on conflict (id) do update set tenant_id = excluded.tenant_id, stage = excluded.stage, chapter_id = excluded.chapter_id, title = excluded.title, description = excluded.description, language = excluded.language, test_kind = excluded.test_kind, starter_files = excluded.starter_files, entry_file = excluded.entry_file, entry_points = excluded.entry_points, tests = excluded.tests, sql_seed = excluded.sql_seed, lint_preset = excluded.lint_preset, static_analysis = excluded.static_analysis, mutation = excluded.mutation, demo_call = excluded.demo_call;
insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), 'ses', 'git-basics', 'Git / GitHub 実務ワークフロー', 'ツール', 'slate', 8, '実務で通用するブランチ戦略とPRレビューを学ぶ。', 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();
-- course_ses_git_basics course uuid variable via subselect
delete from public.sections where course_id in (select id from public.courses where tenant_id = 'ses' and slug = 'git-basics');
insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), 'ses', 'ciso-basic', '情報処理技術者試験 基本情報 — 対策講座', '資格対策', 'green', 40, null, 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();
-- course_ses_ciso_basic course uuid variable via subselect
delete from public.sections where course_id in (select id from public.courses where tenant_id = 'ses' and slug = 'ciso-basic');
insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), 'ses', 'react-intro', 'React入門 — コンポーネント設計からフック活用まで', 'フロントエンド', 'amber', 22, null, 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();
-- course_ses_react_intro course uuid variable via subselect
delete from public.sections where course_id in (select id from public.courses where tenant_id = 'ses' and slug = 'react-intro');
insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), 'coach', 'safety-1', '地域スポーツ指導者 安全管理研修', '必修', 'indigo', null, null, 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();
-- course_coach_safety_1 course uuid variable via subselect
delete from public.sections where course_id in (select id from public.courses where tenant_id = 'coach' and slug = 'safety-1');
insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), 'coach', 'comm-1', '子どもとのコミュニケーション実技', '必修', 'green', null, null, 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();
-- course_coach_comm_1 course uuid variable via subselect
delete from public.sections where course_id in (select id from public.courses where tenant_id = 'coach' and slug = 'comm-1');
insert into public.courses (id, tenant_id, slug, title, category, color, duration_hours, description, status) values (gen_random_uuid(), 'coach', 'first-aid', '応急処置 / 救命講習', '必修', 'amber', null, null, 'published') on conflict (tenant_id, slug) do update set title = excluded.title, category = excluded.category, color = excluded.color, duration_hours = excluded.duration_hours, description = excluded.description, status = excluded.status, updated_at = now();
-- course_coach_first_aid course uuid variable via subselect
delete from public.sections where course_id in (select id from public.courses where tenant_id = 'coach' and slug = 'first-aid');
commit;
