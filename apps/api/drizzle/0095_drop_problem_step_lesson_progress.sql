-- 問題のレッスンの完了は task_problem_results が正本。lesson_progress に写していた行を消す。
delete from lesson_progress where lesson_id in (select step_lesson_id from task_problem_steps);
