function getFilterBtnHTML(taskManager) {
  return `<div class="filter-count" style="display:inline-block; background:#222; font-size:1.2rem; font-weight:600; padding:0.1rem 0.5rem; border-radius:5px; margin-right:0.5rem;">
            ${taskManager.tasks.filter(t => !t.completed).length}
          </div>
          <div class="filter-info" style="display:inline-block;">
            : АКТИВНЫЕ (сlick to filter by deadline)
          </div>`;
}





class StorageManager {
  constructor() {
    this.usersKey = 'tron_users';
    this.tasksKeyPrefix = 'tron_tasks_';
  }
  getUsers() {
    return JSON.parse(localStorage.getItem(this.usersKey)) || [];
  }
  saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }
  addUser(user) {
    const users = this.getUsers();
    return users.some(u => u.username === user.username)
      ? false
      : (users.push(user), this.saveUsers(users), true);
  }
  removeUser(username) {
    const users = this.getUsers().filter(u => u.username !== username);
    this.saveUsers(users);
    localStorage.removeItem(this.tasksKeyPrefix + username);
  }
  getTasks(username) {
    return JSON.parse(localStorage.getItem(this.tasksKeyPrefix + username)) || [];
  }
  saveTasks(username, tasks) {
    localStorage.setItem(this.tasksKeyPrefix + username, JSON.stringify(tasks));
  }
  clearAllData() {
    localStorage.clear();
  }
}





class UserManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.userSelectSection = document.querySelector('.user-select');
    this.userList = document.querySelector('.user-select__list');
    this.addUserBtn = document.querySelector('.user-select__add-btn');
    this.addUserBtn ? this.addUserBtn.addEventListener('click', () => this.handleAddUser()) : null;
  }
  renderUserSelect() {
    const users = this.storageManager.getUsers();
    this.userList.innerHTML = users.length === 0 ? '<li>Нет доступных пользователей</li>' : '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.classList.add('user-select__item');
      li.innerHTML = `
        <span class="user-select__nickname">${user.username}</span>
        <button class="btn user-select__login-btn" data-username="${user.username}">Войти</button>
      `;
      this.userList.appendChild(li);
    });
    document.querySelectorAll('.user-select__login-btn')
      .forEach(btn => btn.addEventListener('click', e => this.handleUserLogin(e)));
  }
  handleUserLogin(event) {
    const username = event.target.getAttribute('data-username');
    const password = prompt(`Введите пароль для пользователя "${username}":`);
    const user = this.storageManager.getUsers().find(u => u.username === username);
    user && user.password === password
      ? (typeof this.onUserLogin === 'function' && this.onUserLogin(username), this.hideUserSelect())
      : alert('Неверный пароль!');
  }
  handleAddUser() {
    const username = prompt('Введите новый никнейм:');
    if (!username) return;
    if (this.storageManager.getUsers().some(u => u.username === username))
      return alert('Пользователь с таким никнеймом уже существует!');
    const password = prompt('Введите пароль для нового пользователя:');
    if (!password) return;
    this.storageManager.addUser({ username, password });
    alert('Пользователь успешно добавлен!');
    this.renderUserSelect();
  }
  showUserSelect() {
    this.renderUserSelect();
    this.userSelectSection.style.display = 'flex';
  }
  hideUserSelect() {
    this.userSelectSection.style.display = 'none';
  }
}





class TaskManager {
  constructor(storageManager, username) {
    this.storageManager = storageManager;
    this.username = username;

    this.tasks = this.storageManager.getTasks(username) || [];

    this.todoListElement = document.querySelector('.todo-list');
    this.todoInput = document.querySelector('.todo-add__input');
    this.todoDeadline = document.querySelector('.todo-add__deadline');
    this.todoDeadlineWarning = document.querySelector('.todo-add__deadline-warning');
    this.todoSubmitBtn = document.querySelector('.todo-add__submit');
    this.addToggleBtn = document.querySelector('.todo-add-toggle');
    this.modalOverlay = document.querySelector('.modal-overlay');
    this.statusButtons = document.querySelectorAll('.todo-add__status-btn');
    this.selectedStatus = 'normal';
    this.filterActive = false;
    this.clearInputs();
    this.todoSubmitBtn.addEventListener('click', () => this.handleAddTask());
    this.addToggleBtn.addEventListener('click', () => this.showAddTaskBlock());
    this.modalOverlay.addEventListener('click', e => { e.target === this.modalOverlay ? this.hideAddTaskBlock() : null; });
    this.statusButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        this.selectedStatus = e.target.classList.contains('todo-add__status-btn--important') ? 'important' : 'normal';
        this.statusButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
    // Drag & Drop
    this.todoListElement.addEventListener('dragover', e => this.handleDragOver(e));
    this.todoListElement.addEventListener('drop', e => this.handleDrop(e));
    this.renderTasks();
  }
  clearInputs() {
    this.todoInput ? (this.todoInput.value = '', this.todoInput.classList.remove('error')) : null;
    this.todoDeadline ? this.todoDeadline.value = '' : null;
    this.todoDeadlineWarning ? this.todoDeadlineWarning.textContent = '' : null;
  }
  renderTasks() {
    if (this.filterActive) {
      let active = this.tasks.filter(t => !t.completed);
      let completed = this.tasks.filter(t => t.completed);
      active = active.sort((a, b) =>
        a.deadline && b.deadline ? new Date(a.deadline) - new Date(b.deadline)
          : a.deadline ? -1 : b.deadline ? 1 : 0);
      this.tasks = [...active, ...completed];
    } else {
      let active = this.tasks.filter(t => !t.completed);
      let completed = this.tasks.filter(t => t.completed);
      this.tasks = [...active, ...completed];
    }
    this.todoListElement.innerHTML = '';
    this.tasks.forEach((task, index) => {
      let deadlineDisplay = task.deadline || '-';
      let remainingSpan = '';
      if (task.deadline) {
        let d = new Date(task.deadline), today = new Date();
        today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
        let diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        diffDays = diffDays < 0 ? 0 : diffDays;
        remainingSpan = `<span class="deadline-remaining" style="color: var(--color-accent); font-weight: bold; margin-left: 0.5rem;">(${diffDays} дн.)</span>`;
      }
      const displayNumber = !task.completed ? `<span class="todo-list__number">${index + 1}</span>` : '';
      const taskHTML = `
        ${displayNumber}
        <span class="todo-list__text text-chromatic">${task.text}</span>
        <span class="todo-list__created">Создана: ${task.created}</span>
        <span class="todo-list__deadline">Дедлайн: ${deadlineDisplay}${remainingSpan}</span>
        <div class="todo-list__actions">
          <button class="btn todo-list__edit-btn" data-index="${index}">Редактировать</button>
          <button class="btn todo-list__delete-btn" data-index="${index}">Удалить</button>
          <button class="btn todo-list__complete-btn" data-index="${index}">${task.completed ? 'Восстановить' : 'Выполнить'}</button>
        </div>
      `;
      const taskDiv = document.createElement('div');
      let classes = 'todo-list__task';
      classes += task.status === 'important' ? ' todo-list__task--important' : '';
      classes += task.completed ? ' todo-list__task--completed' : '';
      taskDiv.className = classes;
      taskDiv.setAttribute('data-index', index);
      taskDiv.draggable = true;
      taskDiv.innerHTML = taskHTML;
      taskDiv.querySelector('.todo-list__edit-btn').addEventListener('click', e => this.handleEditTask(e));
      taskDiv.querySelector('.todo-list__delete-btn').addEventListener('click', e => this.handleDeleteTask(e));
      taskDiv.querySelector('.todo-list__complete-btn').addEventListener('click', e => this.handleCompleteTask(e));
      taskDiv.addEventListener('dragstart', e => this.handleDragStart(e));
      taskDiv.addEventListener('dragend', e => this.handleDragEnd(e));
      this.todoListElement.appendChild(taskDiv);
    });
    const filterBtn = document.querySelector('.todo-filter-btn');
    if (filterBtn) filterBtn.innerHTML = getFilterBtnHTML(this);
  }
  handleAddTask() {
    const text = this.todoInput.value.trim(), deadline = this.todoDeadline.value;
    if (!text) return (this.todoDeadlineWarning.textContent = 'Описание задачи не может быть пустым!', this.todoInput.classList.add('error'));
    if (deadline) {
      let s = new Date(deadline), today = new Date();
      today.setHours(0, 0, 0, 0); s.setHours(0, 0, 0, 0);
      if (s < today) return (this.todoDeadlineWarning.textContent = 'Вы уже опоздали!');
    }
    this.todoInput.classList.remove('error');
    this.todoDeadlineWarning.textContent = '';
    const created = new Date().toLocaleString();
    const newTask = { text, created, deadline, status: this.selectedStatus, completed: false };
    this.tasks.unshift(newTask);
    this.storageManager.saveTasks(this.username, this.tasks);
    this.renderTasks();
    this.clearInputs();
  }
  handleEditTask(e) {
    const index = parseInt(e.target.getAttribute('data-index')), task = this.tasks[index],
          newText = prompt('Редактировать задачу', task.text);
    return newText !== null && newText.trim() !== ''
      ? (this.tasks[index].text = newText.trim(), this.storageManager.saveTasks(this.username, this.tasks), this.renderTasks())
      : null;
  }
  handleDeleteTask(e) {
    const index = parseInt(e.target.getAttribute('data-index'));
    return confirm('Вы действительно хотите удалить эту задачу?')
      ? (this.tasks.splice(index, 1), this.storageManager.saveTasks(this.username, this.tasks), this.renderTasks())
      : null;
  }
  handleCompleteTask(e) {
    const index = parseInt(e.target.getAttribute('data-index')), task = this.tasks[index];
    if (!task.completed) {
      task.completed = true;
      const finishedTask = this.tasks.splice(index, 1)[0];
      this.tasks.push(finishedTask);
    } else {
      if (confirm('Вы хотите восстановить задачу?')) task.completed = false;
    }
    this.storageManager.saveTasks(this.username, this.tasks);
    this.renderTasks();
  }

  handleDragStart(e) {
    if (this.filterActive) {
      this.filterActive = false;
      this.renderTasks();
    }
    const index = parseInt(e.currentTarget.getAttribute('data-index'));
    this.draggedIndex = index;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  }
  handleDragOver(e) {
    e.preventDefault();
    const afterElement = this.getDragAfterElement(e.clientY), draggingEl = document.querySelector('.dragging');
    !afterElement ? this.todoListElement.appendChild(draggingEl)
      : (e.clientY < (afterElement.getBoundingClientRect().top + afterElement.getBoundingClientRect().height/2)
           ? this.todoListElement.insertBefore(draggingEl, afterElement)
           : this.todoListElement.insertBefore(draggingEl, afterElement.nextSibling));
  }
  handleDrop(e) {
    e.preventDefault();
    const newOrder = Array.from(this.todoListElement.children).map(child => parseInt(child.getAttribute('data-index')));
    const reorderedTasks = newOrder.map(oldIndex => this.tasks[oldIndex]);
    this.tasks = reorderedTasks;
    this.storageManager.saveTasks(this.username, this.tasks);
    this.renderTasks();
  }
  handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
  }
  getDragAfterElement(y) {
    const draggableEls = [...this.todoListElement.querySelectorAll('.todo-list__task:not(.dragging)')];
    let closest = { offset: Number.POSITIVE_INFINITY, element: null };
    draggableEls.forEach(child => {
      const box = child.getBoundingClientRect(), center = box.top + box.height/2, offset = Math.abs(y - center);
      if (offset < closest.offset) closest = { offset, element: child };
    });
    return closest.element;
  }
 
  showAddTaskBlock() {
    this.modalOverlay.classList.add('active');
    this.addToggleBtn.style.display = 'none';
  }
  hideAddTaskBlock() {
    this.modalOverlay.classList.remove('active');
    this.addToggleBtn.style.display = 'block';
  }
  toggleFilter() {
    this.filterActive = !this.filterActive;
    if (this.filterActive) {
      let active = this.tasks.filter(t => !t.completed);
      let completed = this.tasks.filter(t => t.completed);
      active = active.sort((a, b) =>
        a.deadline && b.deadline ? new Date(a.deadline) - new Date(b.deadline)
          : a.deadline ? -1 : b.deadline ? 1 : 0);
      this.tasks = [...active, ...completed];
    } else {
      let active = this.tasks.filter(t => !t.completed);
      let completed = this.tasks.filter(t => t.completed);
      this.tasks = [...active, ...completed];
    }
    this.renderTasks();
  }
}





class App {
  constructor() {
    this.storageManager = new StorageManager();
    this.userManager = new UserManager(this.storageManager);
    this.userManager.onUserLogin = username => this.handleUserLogin(username);
    this.topPanelUserName = document.querySelector('.top-panel__name');
    this.switchBtn = document.querySelector('.top-panel__menu-btn--switch');
    this.deleteBtn = document.querySelector('.top-panel__menu-btn--delete');
    this.addToggleBtn = document.querySelector('.todo-add-toggle');
    this.switchBtn.addEventListener('click', () => { this.userManager.showUserSelect(); this.addToggleBtn.style.display = 'none'; });
    this.deleteBtn.addEventListener('click', () => {
      if (!this.currentUser) return;
      const password = prompt(`Введите пароль для удаления пользователя "${this.currentUser}":`);
      if (!password) return alert("Неверный пароль!");
      const user = this.storageManager.getUsers().find(u => u.username === this.currentUser);
      if (!user || user.password !== password) return alert("Неверный пароль!");
      if (confirm("Вы уверены, что хотите удалить текущего пользователя?")) {
        this.storageManager.removeUser(this.currentUser);
        this.currentUser = null;
        this.taskManager = null;
        this.topPanelUserName.textContent = "";
        if (this.storageManager.getUsers().length === 0) {
          this.storageManager.clearAllData();
          this.userManager.renderUserSelect();
        }
        this.userManager.showUserSelect();
        this.addToggleBtn.style.display = "none";
        alert("Пользователь успешно удалён.");
      }
    });
    this.addToggleBtn.addEventListener('click', () => { if (this.taskManager && typeof this.taskManager.showAddTaskBlock === 'function') this.taskManager.showAddTaskBlock(); });
  }
  init() {
    this.storageManager.getUsers().length === 0
      ? (this.userManager.showUserSelect(), this.addToggleBtn.style.display = "none")
      : this.userManager.showUserSelect();
  }
  handleUserLogin(username) {
    this.currentUser = username;
    this.topPanelUserName.textContent = username;
    this.addToggleBtn.style.display = "block";
    const oldTodoList = document.querySelector('.todo-list');
    const newTodoList = document.createElement('section');
    newTodoList.className = 'todo-list';
    oldTodoList.parentNode.replaceChild(newTodoList, oldTodoList);
    const oldModalOverlay = document.querySelector('.modal-overlay');
    const newModalOverlay = oldModalOverlay.cloneNode(true);
    oldModalOverlay.parentNode.replaceChild(newModalOverlay, oldModalOverlay);

    this.taskManager = new TaskManager(this.storageManager, username);

    if (!document.querySelector('.todo-filter-btn')) {
      const filterBtn = document.createElement('button');
      filterBtn.className = 'todo-filter-btn';
      filterBtn.style.width = '100%';
      filterBtn.style.padding = '0.2rem';
      filterBtn.style.position = 'fixed';
      filterBtn.style.bottom = '0';
      filterBtn.style.left = '0';
      filterBtn.style.zIndex = '99';
      filterBtn.style.background = 'rgba(0, 0, 0, 0.9)';
      filterBtn.style.cursor = 'pointer';
      filterBtn.style.color = 'var(--color-accent)';
      filterBtn.innerHTML = getFilterBtnHTML(this.taskManager);
      document.body.appendChild(filterBtn);
      filterBtn.addEventListener('click', () => {
        this.taskManager.toggleFilter();
        filterBtn.innerHTML = getFilterBtnHTML(this.taskManager);
      });
    } else {
      const filterBtn = document.querySelector('.todo-filter-btn');
      filterBtn.innerHTML = getFilterBtnHTML(this.taskManager);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
