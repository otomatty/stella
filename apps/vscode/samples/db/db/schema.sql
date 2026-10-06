-- ToDo の表。テストのたびに、この定義から空のデータベースを作る。
create table todos (
  id serial primary key,
  title text not null check (length(trim(title)) > 0),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
