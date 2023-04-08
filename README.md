# cs50-final
A todo list app created as my final project for Harvard's CS50x.

## Getting started

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

### Production environment

If deploying this to a production environment, copy the `config.example.py` file to `instance/config.py`. Set the `SECRET_KEY` variable to a secure key value, such as with the following command:

```bash
python -c 'import secrets; print(secrets.token_hex())'
```

If using VS Code, you can alternatively run the "Python: generate hex token" task.

## Using the app

### Creating an account

You must have an account before you can begin using the app. When you first visit the app, you will therefore be redirected to the Login page.

To create an account, click the "Register" link in the toolbar and submit the form with valid credentials.

If successful, you will be redirected back to the Login page where you can sign into your new account.
