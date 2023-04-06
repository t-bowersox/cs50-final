import argparse
from datetime import datetime
import os
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('name', help='A description of the migration.')
args = parser.parse_args()

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
name = str(args.name).lower().strip().translate(sanitizer)
now = datetime.today().strftime('%Y%m%d-%H%M%S')
filename = f'{now}_{name}.sql'

try:
    os.chdir('db/migrations')
    subprocess.run(['touch', filename])
except OSError:
    print('Error accessing migrations directory.')
    sys.exit(1)
except subprocess.CalledProcessError:
    print('Error creating migration file.')
    sys.exit(1)
else:
    print(f'Created db/migrations/{filename}')
    sys.exit(0)
