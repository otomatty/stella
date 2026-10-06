"use client";

import { useState } from "react";

/** やることを入力して、一覧に足していく。 */
export function TodoForm() {
  const [title, setTitle] = useState("");
  const [todos, setTodos] = useState([]);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed === "") return;
    setTodos([...todos, { id: crypto.randomUUID(), title: trimmed }]);
    setTitle("");
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="todo-title">やること</label>
        <input
          id="todo-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit">追加</button>
      </form>
      <ul aria-label="ToDo の一覧">
        {todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </>
  );
}
