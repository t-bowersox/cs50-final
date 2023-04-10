import os
import sqlite3
import subprocess
import click
from datetime import datetime
from glob import glob
from flask import Flask, current_app, g


def get_db():
    """Get the active database connection."""

    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row

    return g.db


def close_db(e=None):
    """Close the active database connection."""

    db = g.pop('db', None)

    if db is not None:
        db.close()


@click.command('init-db')
def init_db_command():
    """Migrate the application database."""

    # Get a list of the migration filenames from the migrations dir.
    dir = os.path.join(current_app.root_path, 'migrations')
    migrations = glob('*.sql', root_dir=dir)

    if not len(migrations):
        click.echo('No migrations found.')
        return

    # Connect to the database
    db = get_db()

    # Create the migrations table if it doesn't exist
    try:
        db.execute('CREATE TABLE IF NOT EXISTS migrations ('
                   'id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,'
                   'name TEXT NOT NULL,'
                   'migrated_on NUMERIC NOT NULL DEFAULT CURRENT_TIMESTAMP'
                   ')')
    except sqlite3.DatabaseError:
        click.echo('Error creating migrations table.', err=True)
        close_db()
        return
    else:
        click.echo('Starting migrations...')

    # Run the migrations
    for migration in sorted(migrations):
        # Check if the migration has already been run
        try:
            completed = db.execute(
                'SELECT name FROM migrations WHERE name = ?', [migration]).fetchall()
        except sqlite3.DatabaseError:
            click.echo(f'Error reading migrations table.', err=True)
            return
        else:
            if len(completed):
                continue

        # Otherwise, run it & record it to the migrations table
        file_path = os.path.join(dir, migration)
        with open(file_path) as file:
            click.echo(f'Migrating {migration}...', nl=False)
            sql = file.read()

            try:
                db.execute(sql)
                db.execute(
                    'INSERT INTO migrations (name) VALUES (?)', [migration])
                db.commit()
            except sqlite3.DatabaseError as err:
                click.echo('[failed]')
                close_db()
                raise err
            else:
                click.echo('[done]')

    click.echo('Migrations completed.')


@click.command('create-migration')
@click.argument('name')
def create_migration_command(name: str):
    sanitizer = str.maketrans({
        ' ': '-',
        '\\': '_',
        '/': '_',
        '?': '_',
        '<': '_',
        '>': '_',
        ':': '_',
        '|': '_',
        '*': '_',
        '"': '_'
    })
    name = name.lower().strip().translate(sanitizer)
    now = datetime.today().strftime('%Y%m%d-%H%M%S')
    filename = f'{now}_{name}.sql'

    try:
        dir = os.path.join(current_app.root_path, 'migrations')
        os.chdir(dir)
        subprocess.run(['touch', filename])
    except OSError:
        click.echo('Error accessing migrations directory.')
        return
    except subprocess.CalledProcessError:
        click.echo('Error creating migration file.')
        return
    else:
        click.echo(f'Created db/migrations/{filename}')


def init_app(app: Flask):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
    app.cli.add_command(create_migration_command)


def row_to_dict(row: sqlite3.Row):
    result = {}

    for key in row.keys():
        result[key] = row[key]

    return result
