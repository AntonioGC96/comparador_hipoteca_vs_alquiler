const taskList = document.querySelector("#task-list");
const tasks = [...document.querySelectorAll("[data-task]")];
const progressCopy = document.querySelector("#progress-copy");
const progressBar = document.querySelector("#progress-bar");
const resetTasks = document.querySelector("#reset-tasks");
const notes = document.querySelector("#notes");
const clearNotes = document.querySelector("#clear-notes");

const taskStorageKey = "pages-launch-kit.tasks";
const notesStorageKey = "pages-launch-kit.notes";

function readSavedTasks() {
  try {
    return JSON.parse(localStorage.getItem(taskStorageKey)) ?? {};
  } catch {
    return {};
  }
}

function updateProgress() {
  const completed = tasks.filter((task) => task.checked).length;
  const total = tasks.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressCopy.textContent = `${completed} of ${total} complete`;
  progressBar.style.width = `${percentage}%`;
}

function saveTasks() {
  const snapshot = Object.fromEntries(tasks.map((task) => [task.dataset.task, task.checked]));
  localStorage.setItem(taskStorageKey, JSON.stringify(snapshot));
  updateProgress();
}

function loadTasks() {
  const savedTasks = readSavedTasks();

  tasks.forEach((task) => {
    task.checked = Boolean(savedTasks[task.dataset.task]);
  });

  updateProgress();
}

taskList.addEventListener("change", (event) => {
  if (event.target.matches("[data-task]")) {
    saveTasks();
  }
});

resetTasks.addEventListener("click", () => {
  tasks.forEach((task) => {
    task.checked = false;
  });

  saveTasks();
});

notes.value = localStorage.getItem(notesStorageKey) ?? "";

notes.addEventListener("input", () => {
  localStorage.setItem(notesStorageKey, notes.value);
});

clearNotes.addEventListener("click", () => {
  notes.value = "";
  localStorage.removeItem(notesStorageKey);
  notes.focus();
});

loadTasks();
