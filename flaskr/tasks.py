import sqlite3
from flask import abort, Blueprint, jsonify, render_template, request, session
from . import auth
from flaskr.db import get_db, row_to_dict
from datetime import datetime

bp = Blueprint('tasks', __name__)


@bp.get('/')
@auth.login_required
def index():
    list = None

    db = get_db()

    if 'list_id' not in session:
        list = db.execute('SELECT id FROM lists WHERE user_id = ?',
                          [session['user_id']]).fetchone()
    if list:
        session['list_id'] = list['id']

    return render_template('tasks/index.html.jinja')


@bp.post('/task/')
@bp.get('/task/<int:id>')
@bp.put('/task/<int:id>')
@bp.delete('/task/<int:id>')
@auth.login_required
def task(id=None):
    if request.method in ['GET', 'PUT', 'DELETE'] and id is None:
        abort(422)

    db = get_db()

    if request.method == 'POST':
        data = request.get_json()
        description = data['description']
        list_id = session['list_id']

        try:
            cursor = db.execute(
                'INSERT INTO tasks (list_id, description) VALUES (?, ?)', [list_id, description])
            db.commit()
        except sqlite3.DatabaseError:
            abort(500)
        else:
            return jsonify(cursor.lastrowid), 201
    elif request.method == 'PUT':
        data = request.get_json()
        description = data['description']
        completed = int(data['completed'])
        completed_on = data['completedOn']
        updated_on = datetime.today()

        try:
            current = db.execute(
                'SELECT completed FROM tasks WHERE id = ?', [data['id']]).fetchone()

            if completed and current['completed'] == 0:
                completed_on = datetime.today()
            elif not completed and current['completed'] == 1:
                completed_on = None

            cursor = db.execute(
                'UPDATE tasks SET description = ?, completed = ?, completed_on = ?, updated_on = ? WHERE id = ?',
                [description, completed, completed_on, updated_on, id])
            db.commit()
        except sqlite3.DatabaseError:
            abort(500)
        else:
            return jsonify(cursor.rowcount)
    elif request.method == 'DELETE':
        try:
            cursor = db.execute('DELETE FROM tasks WHERE id = ?', [id])
            db.commit()
        except sqlite3.DatabaseError:
            abort(500)
        else:
            return jsonify(cursor.rowcount)
    else:
        try:
            row = db.execute(
                'SELECT * FROM tasks WHERE id = ?', [id]).fetchone()
            return row_to_dict(row)
        except sqlite3.DatabaseError:
            abort(500)


@bp.get('/tasks')
@auth.login_required
def tasks():
    tasks = []

    db = get_db()

    try:
        rows = db.execute(
            'SELECT * FROM tasks WHERE list_id = ? AND completed = 0', [session['list_id']]).fetchall()
        for row in rows:
            tasks.append(row_to_dict(row))
    except KeyError:
        abort(400)
    except sqlite3.DatabaseError:
        abort(500)
    else:
        return tasks


@bp.get('/history')
@auth.login_required
def history():
    page = request.args.get('p', 0)
    tasks = []  # type: list[dict]
    limit = 10
    db = get_db()

    if request.is_json:
        rows = db.execute(
            'SELECT COUNT(*) AS count FROM tasks WHERE list_id = ? AND completed = 1', [session['list_id']]).fetchone()

        count = rows['count']

        rows = db.execute(
            'SELECT * FROM tasks WHERE list_id = ? AND completed = 1 ORDER BY completed_on DESC LIMIT ? OFFSET ?',
            [session['list_id'], limit, limit * int(page)]).fetchall()

        for row in rows:
            tasks.append(row_to_dict(row))

        return {'tasks': tasks, 'count': count, 'pageSize': limit}
    else:
        return render_template('history/index.html.jinja')
