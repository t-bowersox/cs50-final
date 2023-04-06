import glob
import os
import sqlite3
import sys

try:
    os.chdir('db')
except OSError:
    print('Unable to access migrations directory.')
    sys.exit(1)

# Get a list of the migration filenames from the migrations dir.
migrations = glob.glob('*.sql', root_dir='./migrations')

if not len(migrations):
    print('No migrations found.')
    sys.exit(0)

# Connect to the database
db_connection = sqlite3.connect('todo.db', isolation_level=None)
db = db_connection.cursor()

# Create the migrations table if it doesn't exist
try:
    db.execute('CREATE TABLE IF NOT EXISTS migrations ('
               'id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,'
               'name TEXT NOT NULL,'
               'migrated_on NUMERIC NOT NULL DEFAULT CURRENT_TIMESTAMP'
               ')')
except sqlite3.DatabaseError:
    print('Error creating migrations table.')
    db_connection.close()
    sys.exit(1)
else:
    print('Starting migrations...')

# Run the migrations
for migration in sorted(migrations):
    # Check if the migration has already been run
    try:
        completed = db.execute(
            'SELECT name FROM migrations WHERE name = ?', [migration]).fetchall()
    except sqlite3.DatabaseError:
        print(f'Error reading migrations table.')
        sys.exit(1)
    else:
        if len(completed):
            continue

    # Otherwise, run it & record it to the migrations table
    with open(f'migrations/{migration}') as file:
        print(f'Migrating {migration}', end='...')
        sql = file.read()

        try:
            db.execute(sql)
            db.execute('INSERT INTO migrations (name) VALUES (?)', [migration])
        except sqlite3.DatabaseError as err:
            print['[failed]']
            db_connection.close()
            raise err
        else:
            print('[done]')

# Exit with a success code
db_connection.close()
print('Migrations completed.')
exit(0)
