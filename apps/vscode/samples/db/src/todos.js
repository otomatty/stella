/** @typedef {import("@electric-sql/pglite").PGlite} Database */

/**
 * ToDo を 1 件追加し、追加した行を返す。
 * @param {Database} db
 * @param {string} title
 */
export async function addTodo(db, title) {
  const result = await db.query(
    "insert into todos (title) values ($1) returning id, title, done",
    [title],
  );
  return result.rows[0];
}

/**
 * ToDo を終わった状態にする。
 * @param {Database} db
 * @param {number} id
 */
export async function completeTodo(db, id) {
  await db.query("update todos set done = true where id = $1", [id]);
}

/**
 * 終わっていない ToDo を、追加した順に返す。
 * @param {Database} db
 */
export async function listOpenTodos(db) {
  const result = await db.query(
    // TODO: 終わっていないものだけに絞る
    "select id, title, done from todos order by id",
  );
  return result.rows;
}
