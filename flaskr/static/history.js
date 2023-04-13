import { Task } from "./tasks.js";

const PREV_PAGE = 'prev';
const NEXT_PAGE = 'next';

export class TaskHistory extends HTMLElement {
    /** @type {'busy'|'ready'|'error'} */
    #state;
    /** @type {Task[]} */
    #tasks;
    /** @type {number} */
    #taskCount;
    /** @type {number} */
    #currentPage;
    /** @type {number} */
    #pageSize;
    /** @type {number} */
    #pageCount;
    /** @type {HTMLDivElement} */
    #spinner;
    /** @type {HTMLDivElement} */
    #noTasksMsg;
    /** @type {HTMLDivElement} */
    #errorAlert;
    /** @type {HTMLTableElement} */
    #tasksTable;
    /** @type {HTMLElement} */
    #tableBody;
    /** @type {HTMLUListElement} */
    #tableNav;
    /** @type {HTMLTemplateElement} */
    #taskRowTemplate;
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
        this.#taskCount = 0;
        this.#currentPage = 0;
        this.#pageCount = 0;

        /** @type {HTMLTemplateElement} */
        const template = document.querySelector('template#task-history');

        if (template) {
            this.appendChild(template.content.cloneNode(true));
            this.#spinner = this.querySelector('#spinner');
            this.#noTasksMsg = this.querySelector('#no-tasks');
            this.#errorAlert = this.querySelector('#error-alert');
            this.#tasksTable = this.querySelector('#history-table');
            this.#tableBody = this.querySelector('#history-table-body');
            this.#taskRowTemplate = document.querySelector('#history-item');
            this.#initTableNav();
            this.#initEditTaskModal();
            this.#initDeleteTaskModal();
            this.#loadTasks().then(() => {
                this.#setTableMinHeight();
            });

            // Whenever the viewport resizes, recalculate the min height of the table so it adapts.
            visualViewport.addEventListener('resize', () => {
                this.#setTableMinHeight(true);
            })
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
                this.#tasksTable.classList.add('d-none');
                this.#errorAlert.classList.add('d-none');
                this.#spinner.classList.remove('d-none');
                break;
            case 'ready':
                this.#spinner.classList.add('d-none');
                this.#tasks.length
                    ? this.#tasksTable.classList.toggle('d-none')
                    : this.#noTasksMsg.classList.toggle('d-none');
                break;
            case 'error':
                this.#spinner.classList.add('d-none');
                this.#errorAlert.classList.toggle('d-none')
                break;
        }
    }

    async #loadTasks() {
        this.#setState('busy');
        const endpoint = this.#currentPage ? `/history?p=${this.#currentPage}` : '/history';

        try {
            const response = await fetch(endpoint, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                this.#setState('error')
                return;
            }

            /** @type {object[]} */
            const { tasks, count, pageSize } = await response.json();
            this.#tasks = tasks.map((taskData) => new Task(taskData));

            const prevTaskCount = this.#taskCount;

            this.#taskCount = count;
            this.#pageSize = pageSize;
            this.#pageCount = Math.ceil(this.#taskCount / this.#pageSize);

            if (count !== prevTaskCount) {
                this.#renderTableNav();
            }

            this.#renderTable();
            this.#setState('ready');
        } catch (error) {
            console.error(error);
            this.#setState('error');
        }
    }

    #renderTable() {
        /** @type {HTMLTableRowElement[]} */
        this.#tasksTable.querySelectorAll('tr[data-task-id]').forEach((tr) => tr.remove());
        this.#tasks.forEach((task) => this.#appendTaskItemToTable(task));
    }

    /**
     * @param {Task} task 
     */
    #appendTaskItemToTable(task) {
        const taskRow = this.#taskRowTemplate.content.cloneNode(true);
        const taskItem = taskRow.querySelector('tr');
        taskItem.dataset.taskId = task.id;

        const description = taskRow.querySelector('span.task-description');
        description.innerText = task.description;

        const completedOn = taskRow.querySelector('td.task-completed-on');
        completedOn.innerText = task.localeCompletedDate;

        const altCompletedOn = taskRow.querySelector('div.alt-completed-on');
        altCompletedOn.innerText = `Completed on: ${task.localeCompletedDate}`;

        this.#setEditTaskModalTrigger(task, taskRow);
        this.#setDeleteTaskModalTrigger(task, taskRow);

        const markIncompleteBtn = taskRow.querySelector('#incomplete-btn');
        markIncompleteBtn.addEventListener('click', async () => {
            task.completed = false;
            this.#setState('busy');

            try {
                const success = await this.#updateTask(task);
                success ? this.#loadTasks() : this.#setState('error');
            } catch (error) {
                this.#setState('error');
            }
        });

        this.#tableBody.appendChild(taskRow);
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
     * @param {HTMLTableRowElement} taskElement 
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
                        const row = this.#tasksTable.querySelector(`tr[data-task-id="${task.id}"]`);
                        const description = row.querySelector('td.task-description');
                        description.innerText = task.description;
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
            const description = this.#deleteTaskModal.querySelector('#warning .description');
            description.innerText = task.description;

            this.#deleteTaskListener = async (event) => {
                event.preventDefault();
                this.#deleteTaskModalRef.hide();
                this.#setState('busy');

                const success = await this.#deleteTask(task);

                if (success) {
                    this.#removeTaskFromList(task);
                    this.#loadTasks();
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

    /**
     * @param {Task} task 
     */
    #removeTaskFromList(task) {
        const index = this.#tasks.findIndex((t) => t.id === task.id);

        if (index >= 0) {
            this.#tasks.splice(index, 1);
        }
    }

    #initTableNav() {
        this.#tableNav = this.querySelector('#history-nav > ul');
        this.#tableNav.addEventListener('click', async (event) => {
            /** @type {HTMLElement} */
            const pageLink = event.target;

            if (!pageLink.classList.contains('page-link')) {
                return;
            }

            const page = pageLink.dataset.page;

            switch (page) {
                case PREV_PAGE:
                    this.#currentPage--;
                    break;
                case NEXT_PAGE:
                    this.#currentPage++;
                    break;
                default:
                    this.#currentPage = Number(page) - 1;
            }

            this.#updateNavState();
            await this.#loadTasks();
        });
    }

    #updateNavState() {
        /** @type {HTMLButtonElement} */
        const prevBtn = this.#tableNav.querySelector(`[data-page="${PREV_PAGE}"]`);
        const nextBtn = this.#tableNav.querySelector(`[data-page="${NEXT_PAGE}"]`);

        if (this.#currentPage === 0 || this.#pageCount < 2) {
            prevBtn.parentElement.classList.add('disabled')
        } else {
            prevBtn.parentElement.classList.remove('disabled')
        }

        if (this.#currentPage === this.#pageCount - 1 || this.#pageCount < 2) {
            nextBtn.parentElement.classList.add('disabled')
        } else {
            nextBtn.parentElement.classList.remove('disabled')
        }

        // Set active class on current page
        this.#tableNav.querySelector('li.active')?.classList.remove('active');
        const activeLink = this.#tableNav.querySelector(`[data-page="${this.#currentPage + 1}"]`);
        activeLink?.parentElement.classList.add('active');
    }

    #renderTableNav() {
        this.#tableNav.querySelectorAll('.page-item').forEach((li) => li.remove());
        this.#tableNav.appendChild(this.#createPageNavItem(PREV_PAGE, 'Previous'));

        for (let i = 1; i <= this.#pageCount; i++) {
            this.#tableNav.appendChild(this.#createPageNavItem(i));
        }

        this.#tableNav.appendChild(this.#createPageNavItem(NEXT_PAGE, 'Next'));
        this.#updateNavState();
    }

    /**
     * @param {string|number} page 
     * @param {string} innerText 
     */
    #createPageNavItem(page, innerText) {
        /** @type {HTMLTemplateElement} */
        const template = this.querySelector('#page-item');
        /** @type {HTMLLIElement} */
        const pageItem = template.content.cloneNode(true);

        /** @type {HTMLButtonElement} */
        const pageLink = pageItem.querySelector('.page-link');
        pageLink.innerText = innerText ?? page.toString();
        pageLink.dataset.page = page;

        return pageItem;
    }

    /**
     * Minimizes layout shift of the pagination buttons when switching pages.
     * @param {boolean} forceReset
     */
    #setTableMinHeight(forceReset) {
        const buffer = 10;

        if (this.#tasksTable) {
            const tableContainer = this.#tasksTable.parentElement;
            const currentMinHeight = Number(tableContainer.style.minHeight.replace('px', ''));
            const tableHeight = this.#tasksTable.getBoundingClientRect().height;

            if (tableHeight > currentMinHeight || forceReset) {
                tableContainer.style.minHeight = `${tableHeight + buffer}px`;
            }
        }
    }
}