export class TaskList extends HTMLElement {
    /** @type {'busy'|'ready'|'error'} */
    #state;
    /** @type {Task[]} */
    #tasks;
    /** @type {HTMLFormElement} */
    #addTaskForm;
    /** @type {HTMLInputElement} */
    #addTaskInput;
    /** @type {HTMLDivElement} */
    #spinner;
    /** @type {HTMLDivElement} */
    #noTasksMsg;
    /** @type {HTMLDivElement} */
    #errorAlert;
    /** @type {HTMLUListElement} */
    #tasksList;
    /** @type {HTMLTemplateElement} */
    #taskItemTemplate;
    /** @type {HTMLDivElement} */
    #editTaskModal;
    /** @type {bootstrap.Modal} */
    #editTaskModalRef;
    /** @type {Function} */
    #editTaskListener;
    /** @type {HTMLDivElement} */
    #deleteTaskModal;
    /** @type {bootstrap.Modal} */
    #deleteTaskModalRef;
    /** @type {Function} */
    #deleteTaskListener;

    constructor() {
        super();
        this.#tasks = [];

        /** @type {HTMLTemplateElement} */
        const template = document.querySelector('template#task-list');

        if (template) {
            this.appendChild(template.content.cloneNode(true));
            this.#spinner = this.querySelector('#spinner');
            this.#noTasksMsg = this.querySelector('#no-tasks');
            this.#tasksList = this.querySelector('#tasks-list');
            this.#errorAlert = this.querySelector('#error-alert');
            this.#taskItemTemplate = document.querySelector('#task-item');
            this.#initTaskForm();
            this.#initTaskCompletion();
            this.#initEditTaskModal();
            this.#initDeleteTaskModal();
            this.#loadTasks();
        }
    }

    /**
     * @param {'busy' | 'ready' | 'error'} state 
     */
    #setState(state) {
        this.#state = state;

        switch (state) {
            case 'busy':
                this.#noTasksMsg.classList.add('d-none');
                this.#tasksList.classList.add('d-none');
                this.#errorAlert.classList.add('d-none');
                this.#spinner.classList.remove('d-none');
                break;
            case 'ready':
                this.#spinner.classList.add('d-none');
                this.#tasks.length
                    ? this.#tasksList.classList.toggle('d-none')
                    : this.#noTasksMsg.classList.toggle('d-none');
                break;
            case 'error':
                this.#spinner.classList.add('d-none');
                this.#errorAlert.classList.toggle('d-none')
                break;
        }
    }

    #initTaskForm() {
        this.#addTaskForm = this.querySelector('form');
        this.#addTaskInput = this.#addTaskForm.querySelector('input');

        this.#addTaskForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const description = this.#addTaskInput.value;

            if (!description || this.#state === 'busy') {
                return;
            }

            this.#setState('busy');
            const added = await this.#addTask(description);

            if (added) {
                this.#addTaskForm.reset();
                this.#renderList();
                this.#setState('ready');
            } else {
                this.#setState('error');
            }
        });
    }

    /** @param {string} description */
    async #addTask(description) {
        try {
            let response = await fetch('/task/', {
                method: 'POST',
                body: JSON.stringify({ description }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                return false;
            }

            /** @type {number} */
            const taskId = await response.json();

            if (!taskId) {
                return false;
            }

            response = await fetch(`/task/${taskId}`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                return false;
            }

            /** @type {object} */
            const taskData = await response.json();
            this.#tasks.push(new Task(taskData));
            return true;
        } catch (error) {
            console.error(error);
            return false
        }
    }

    #renderList() {
        this.#tasks.forEach((task) => {
            let taskItem = this.#tasksList.querySelector(`li[data-task-id="${task.id}"]`)

            if (!taskItem) {
                this.#appendTaskItemToList(task);
                return;
            }

            const label = taskItem.querySelector('label');

            if (label?.innerText !== task.description) {
                label.innerText = task.description;
            }
        });
    }

    /**
     * @param {Task} task 
     */
    #appendTaskItemToList(task) {
        /** @type {HTMLLIElement} */
        const taskItem = this.#taskItemTemplate.content.cloneNode(true);
        const listItem = taskItem.querySelector('li');
        listItem.dataset.taskId = task.id;

        const checkbox = taskItem.querySelector('input');
        checkbox.name = `task-item-${task.id}`;
        checkbox.id = checkbox.name;
        checkbox.dataset.taskId = task.id;

        const label = taskItem.querySelector('label');
        label.htmlFor = checkbox.id;
        label.innerText = task.description;

        this.#setEditTaskModalTrigger(task, taskItem);
        this.#setDeleteTaskModalTrigger(task, taskItem);

        this.#tasksList.appendChild(taskItem);
    }

    #initTaskCompletion() {
        this.#tasksList.addEventListener('change', async (event) => {
            const target = event.target;

            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            const task = this.#tasks.find((task) => task.id == target.dataset.taskId);

            if (!task) {
                target.remove();
                return;
            }

            this.#setState('busy');
            task.completed = target.checked;

            const success = await this.#updateTask(task);

            if (success) {
                this.#removeTaskFromList(task);
                this.#setState('ready');
            } else {
                this.#setState('error');
            }
        });
    }

    /**
     * @param {Task} task 
     */
    async #updateTask(task) {
        try {
            const response = await fetch(`/task/${task.id}`, {
                method: 'PUT',
                body: JSON.stringify(task),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                return false;
            }

            /** @type {number} */
            const updatedRows = await response.json();

            if (!updatedRows) {
                return false;
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    /**
     * @param {Task} task 
     */
    #removeTaskFromList(task) {
        const index = this.#tasks.findIndex((t) => t.id === task.id);
        const element = Array.from(this.#tasksList.querySelectorAll('li'))
            .find((li) => li.dataset.taskId == task.id);

        if (index >= 0) {
            this.#tasks.splice(index, 1);
            element?.remove();
        }
    }

    async #loadTasks() {
        this.#setState('busy');

        try {
            const response = await fetch('/tasks', {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                this.#setState('error')
                return;
            }

            /** @type {object[]} */
            const tasks = await response.json();
            this.#tasks = tasks.map((taskData) => new Task(taskData));
            this.#renderList();
            this.#setState('ready');
        } catch (error) {
            console.error(error);
            this.#setState('error');
        }
    }

    #initEditTaskModal() {
        this.#editTaskModal = document.querySelector('#edit-task-modal');
        this.#editTaskModalRef = new bootstrap.Modal(this.#editTaskModal);

        const form = this.#editTaskModal.querySelector('form');

        this.#editTaskModal.addEventListener('hidden.bs.modal', () => {
            form.removeEventListener('submit', this.#editTaskListener);
        });
    }

    /**
     * @param {Task} task 
     * @param {HTMLLIElement} taskElement 
     */
    #setEditTaskModalTrigger(task, taskElement) {
        /** @type {HTMLButtonElement} */
        const editBtn = taskElement.querySelector('#edit-btn')
        editBtn.addEventListener('click', () => {
            const form = this.#editTaskModal.querySelector('form');
            const input = this.#editTaskModal.querySelector('input');
            input.value = task.description;

            this.#editTaskListener = async (event) => {
                event.preventDefault();

                if (!form.checkValidity()) {
                    return;
                }

                this.#editTaskModalRef.hide();

                if (input.value !== task.description) {
                    this.#setState('busy');
                    task.description = input.value;

                    const success = await this.#updateTask(task);

                    if (success) {
                        this.#renderList();
                        this.#setState('ready');
                    } else {
                        this.#setState('error');
                    }
                }

                form.reset();
                form.classList.remove('was-validated');
            }

            form.addEventListener('submit', this.#editTaskListener);
            this.#editTaskModalRef.show();
        });
    }

    #initDeleteTaskModal() {
        this.#deleteTaskModal = document.querySelector('#delete-task-modal');
        this.#deleteTaskModalRef = new bootstrap.Modal(this.#deleteTaskModal);

        const form = this.#deleteTaskModal.querySelector('form');

        this.#deleteTaskModal.addEventListener('hidden.bs.modal', () => {
            form.removeEventListener('submit', this.#deleteTaskListener);
        });
    }

    /**
     * @param {Task} task 
     * @param {HTMLLIElement} taskElement 
     */
    #setDeleteTaskModalTrigger(task, taskElement) {
        /** @type {HTMLButtonElement} */
        const deleteBtn = taskElement.querySelector('#delete-btn')
        deleteBtn.addEventListener('click', () => {
            /** @type {HTMLParagraphElement} */
            const warning = this.#deleteTaskModal.querySelector('#warning');
            warning.innerText = warning.innerText.replace('%description%', task.description);

            this.#deleteTaskListener = async (event) => {
                event.preventDefault();
                this.#deleteTaskModalRef.hide();
                this.#setState('busy');

                const success = await this.#deleteTask(task);

                if (success) {
                    this.#removeTaskFromList(task);
                    this.#setState('ready');
                } else {
                    this.#setState('error');
                }
            }

            const form = this.#deleteTaskModal.querySelector('form');
            form.addEventListener('submit', this.#deleteTaskListener);
            this.#deleteTaskModalRef.show();
        });
    }

    /**
     * @param {Task} task 
     */
    async #deleteTask(task) {
        try {
            const response = await fetch(`/task/${task.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                return false;
            }

            const deletedCount = await response.json();
            return !!deletedCount;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}

class Task {
    /**
     * @param {Object} taskData
     * @param {number} taskData.id
     * @param {number} taskData.list_id
     * @param {string} taskData.description
     * @param {0|1} taskData.completed
     * @param {string|null} taskData.completed_on
     * @param {string} taskData.created_on
     * @param {string} taskData.updated_on
     */
    constructor(taskData) {
        /** @type {number} */
        this.id = taskData.id;

        /** @type {number} */
        this.listId = taskData.list_id;

        /** @type {string} */
        this.description = taskData.description;

        /** @type {boolean} */
        this.completed = !!taskData.completed;

        /** @type {Date} */
        this.completedOn = taskData.completed_on ? new Date(taskData.completed_on) : null;

        /** @type {Date} */
        this.createdOn = new Date(taskData.created_on);

        /** @type {Date} */
        this.updatedOn = new Date(taskData.updated_on);
    }
}
