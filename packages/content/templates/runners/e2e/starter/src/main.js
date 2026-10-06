const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-title");
const error = document.querySelector("#todo-error");
const list = document.querySelector("#todo-list");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (title === "") {
    error.textContent = "やることを入力してください";
    return;
  }
  error.textContent = "";
  const item = document.createElement("li");
  item.textContent = title;
  list.append(item);
  input.value = "";
  input.focus();
});
