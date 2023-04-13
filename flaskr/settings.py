import sqlite3
from flask import abort, Blueprint, flash, jsonify, redirect, render_template, request, session, url_for

from flaskr.db import get_db
from . import auth
from werkzeug.security import check_password_hash, generate_password_hash

bp = Blueprint('settings', __name__, url_prefix='/settings')


@bp.get('/')
@auth.login_required
@auth.password_required
def index():
    db = get_db()
    user = db.execute('SELECT username FROM users WHERE id = ?', [
                      session['user_id']]).fetchone()
    return render_template('settings/index.html.jinja', current_username=user['username'])


@bp.post('/change-username')
@auth.login_required
def change_username():
    username = request.form['username']
    db = get_db()

    try:
        db.execute('UPDATE users SET username = ? WHERE id = ?', [
            username, session['user_id']])
        db.commit()
    except sqlite3.IntegrityError:
        flash('username', 'error')
    else:
        flash('username', 'info')

    return redirect(url_for('settings.index'))


@bp.post('/change-password')
@auth.login_required
def change_password():
    current_password = request.form['current-password']
    new_password = request.form['new-password']
    new_password_confirmation = request.form['new-password-confirmation']
    db = get_db()

    if not new_password or len(new_password) < 8:
        flash('new-password', 'error')
    elif new_password != new_password_confirmation:
        flash('new-password-confirmation', 'error')
    else:
        try:
            user = db.execute('SELECT password FROM users WHERE id = ?', [
                              session['user_id']]).fetchone()

            if user and check_password_hash(user['password'], current_password):
                db.execute('UPDATE users SET password = ? WHERE id = ?', [
                           generate_password_hash(new_password), session['user_id']])
                db.commit()
                flash('current-password', 'info')
            else:
                flash('current-password', 'error')
        except sqlite3.DatabaseError:
            abort(500)

    return redirect(url_for('settings.index'))
