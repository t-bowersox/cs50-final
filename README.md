# cs50-final: Todo App
A todo list app created as my final project for Harvard's CS50x.

## Video demo

https://youtu.be/CCeE_RtOxu0

## Description

Although the world certainly doesn't need another todo list app, it's a great starter project for learning a new framework or language in depth. That allowed me to focus less on what the app needs to do and more on how to build it.

I designed this app using a [SQLite](https://sqlite.org) database, [Python](https://python.org) server running [Flask](https://palletsprojects.com/p/flask/), and a UI built with [Bootstrap](https://getbootstrap.com/) and [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components).

I decided to use this stack for a couple of reasons: I didn't want to stray too far from what we covered in class; and, I have been interested in learning Python for a while, so this seemed like a great opportunity to build something with it. It was also the type of project that didn't require a very complex user interface, so I decided to save some time and use Bootstrap. I built native HTML5 web components on top of that, allowing for a more dynamic UI when adding and manage tasks.

In the end, I think I made the right decision for the scope of this project. If I were building this with the goal of hosting it on a production server, I would have certainly opted for a different database like MySQL. That would allow the app and database to be run on separate servers, making it easier to scale and allowing the database to persist separately from the web app. I also would have created a test suite for the Python code.

What follows is an overview of what you'll find in the project repo.

### Project root

In the project's root directory, you're going to find some general configuration files. A lot of these are common to most projects, but worth noting here is the `config.example.py` file. This file can be copied to `instance/config.py` and provided a `SECRET_KEY` value. This is used by Flask for signing session cookies.

Also, you'll find a `requirements.txt` file that is used by the [PIP](https://pypi.org/project/pip/) package manager to install the project's required dependencies (in this case, just Flask).

### `.devcontainer` & `.vscode`

These directories configure the development environment for VS Code, which is the editor I used to create this project. The dev container is a [Docker](https://docker.com) container running Ubuntu Linux and comes with common developer tools out of the box, like Git. For this project, I configured it to include Python and SQLite, as well as to run some tasks after the container is created so the environment is ready to go.

The VS Code configuration includes a `launch.json` file for providing debugger configurations; a `settings.json` file to configure a couple of handy VS Code settings for Python; and a `tasks.json` file for configuring a few predefined tasks you can run in VS Code (like starting the Flask server in debug mode).

### `flaskr`

This directory serves as the Flask application package and is what's executed when you start the server. The `__init__.py` file serves as the app's entry point: it contains an app factory that returns a configured Flask application to be run.

That file imports several modules that contain the app's business logic:

- `auth.py` creates a Blueprint defining routes for registration, authentication, and password confirmation. It also defines two route decorators: one that restricts access to a route to an authenticated user; and one that requires a user to confirm their password before proceeding to a route.
- `db.py` is a series of functions that initializes a `sqlite3` database connection to be used throughout the app. It also defines a couple of Flask CLI commands that will create new database migration scripts (`create-migration`) and run those migrations (`init-db`).
    - The dev container is actually configured to run `init-db` for you when the container is created.
    - When run, it'll execute only those migrations that have not been run yet, storing the names in a `migrations` table to keep track.
- `settings.py` creates a Blueprint defining routes for changing a user's settings.
- `tasks.py` creates a Blueprint defining routes for creating and managing a user's tasks, as well as their task history.

You will also find a few subdirectories:

- `migrations` contains SQL scripts to be executed by the `init-db` CLI command. These create the tables and indexes required for the app to work.
- `static` contains the app's favicons, stylesheet, and (most significantly) JavaScript files.
    - `history.js` exports a web component class that allows users to view their completed task history. It is used on the History page so that users can browse, modify, and delete tasks without a page reload. It instead calls API routes defined in the `tasks.py` module to update the UI dynamically.
    - `main.js` exports a function that initializes Bootstrap's client-side form navigation. 
    - `tasks.js` exports a web component class that allows users to create and manage their incomplete tasks. It is used on the homepage so that users can create, edit, and delete tasks without a page reload. It instead calls API routes defined in the `tasks.py` module to update the UI dynamically.
- `templates` contains the apps Jinja templates. The templates provide the HTML for each page, along with a base layout shared across all pages. Here you will also find partial templates that are included in specific pages, such as dialogs, a loading spinner, and icons. This allows for a greater degree of reusability of common components.

### Other directories

After the dev container is created and the app is started, you'll notice a couple of directories appear that are ignored by version control.

- `instance` is a directory created by Flask that contains files specific to your instance of the `flaskr` package. This will always include the `todo.db` SQLite database file, but can optionally include a `config.py` configuration file (explained above).
- `venv` is a Python virtual environment. It is a best practice to create a virtual environment for each Python project to ensure that it runs without conflicting with the global Python environment. This is especially important when working with external dependencies (such as Flask) where you might need a specific version.

## Running the app

1. Clone this repository.
2. Open the repository in your editor.
    - Recommend using VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension installed.
3. If you are not using a Dev Container, you will need to run the following to install required dependencies:

```bash
. venv/bin/activate && pip install -r requirements.txt
```

4. If you are not using a Dev Container, run the following to initialize the app database:

```bash
flask --app flaskr init-db
```

5. If you are using VS Code, run the "Flask: run" task to launch the Flask application. Otherwise, run the following:

```bash
flask --app flaskr run
```

### Optional

If you would like to set a secure key for signing cookies, copy the `config.example.py` file to `instance/config.py`. Set the `SECRET_KEY` variable to a secure key value, such as with the following command:

```bash
python -c 'import secrets; print(secrets.token_hex())'
```

If using VS Code, you can alternatively run the "Python: generate hex token" task.

## Using the app

You must have an account before you can begin using the app. When you first visit the app, you will therefore be redirected to the Login page.

To create an account, click the "Register" link in the toolbar and submit the form with valid credentials.

If successful, you will be redirected back to the Login page where you can sign into your new account.

Although the demo video provides an overview of how to use the app, below is a brief summary of features:

- Tasks: from the homepage, you can add, edit, and delete tasks for you to do. When a task is complete, you can click on its checkbox and it will be removed from your tasks list.
- History: you can browse, edit, delete, and mark incomplete all of the tasks you've completed. Tasks are presented in descending chronological order, and you can browse 10 per page.
- Settings: you can update your username and password from this page.
- Logout: click this link to end your session and log out of the app.
