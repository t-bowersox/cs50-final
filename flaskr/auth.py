import functools
from flask import (
    abort, Blueprint, flash, g, jsonify, redirect, render_template, request, session, url_for
)
from werkzeug.security import check_password_hash, generate_password_hash
from flaskr.db import get_db
from datetime import datetime, timedelta

bp = Blueprint('auth', __name__, url_prefix='/auth')

PW_CONFIRMATION_WINDOW_HOURS = 3


@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST' and valid_registration(request.form):
        username = request.form['username']
        password = request.form['password']

        db = get_db()

        try:
            cursor = db.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                                [username, generate_password_hash(password)])
            db.execute("INSERT INTO lists (user_id) VALUES (?)",
                       [cursor.lastrowid])
            db.commit()
        except db.IntegrityError:
            flash('username')
            flash('username-unavailable')
        else:
            return redirect(url_for('auth.login'))

    return render_template('auth/register.html.jinja', form=request.form)


def valid_registration(form: dict) -> bool:
    """Determines if a registration form submission is valid."""

    username = form.get('username')
    password = form.get('password')
    password_confirmation = form.get('password-confirmation')
    is_valid = True

    if not username:
        flash('username')
        is_valid = False
    if not password or len(password) < 8:
        flash('password')
        is_valid = False
    if password != password_confirmation:
        flash('password-confirmation')
        is_valid = False

    return is_valid


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if username is None or password is None:
            flash('username')
        else:
            db = get_db()
            user = db.execute(
                'SELECT * FROM users WHERE username = ?', [username]).fetchone()

            if user and check_password_hash(user['password'], password):
                session.clear()
                session['user_id'] = user['id']
                return redirect(url_for('tasks.index'))
            else:
                flash('username')

    return render_template('auth/login.html.jinja')


@bp.before_app_request
def load_logged_in_user():
    user_id = session.get('user_id')
    db = get_db()

    if user_id is None:
        g.user = None
    else:
        g.user = db.execute(
            'SELECT * FROM users WHERE id = ?', [user_id]).fetchone()


@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))


@bp.route('/confirm-password', methods=['GET', 'POST'])
def confirm_password():
    if request.method == 'POST':
        password = request.form['password']
        destination = request.form.get('destination', url_for('tasks.index'))
        db = get_db()
        user = db.execute('SELECT password FROM users WHERE id = ?', [
                          session['user_id']]).fetchone()

        if user and check_password_hash(user['password'], password):
            session['confirmed_at'] = datetime.now().isoformat()
            return redirect(destination)
        else:
            flash('password')
            return redirect(request.referrer)

    destination = request.args.get('destination', url_for('tasks.index'))
    return render_template('auth/confirm-password.html.jinja', destination=destination)


def login_required(view):
    """Route decorator that requires a user to be logged in."""

    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            if request.is_json:
                return jsonify(), 401
            else:
                return redirect(url_for('auth.login'))

        return view(**kwargs)

    return wrapped_view


def password_required(view):
    """Route decorator that requires a user to confirm their password."""

    @functools.wraps(view)
    def wrapped_view(**kwargs):
        redirect_url = f"{url_for('auth.confirm_password')}?destination={request.path}"

        if 'confirmed_at' not in session:
            return redirect(redirect_url)

        confirmed_at = datetime.fromisoformat(session['confirmed_at'])
        delta = datetime.now() - confirmed_at

        if delta > timedelta(hours=PW_CONFIRMATION_WINDOW_HOURS):
            return redirect(redirect_url)
        else:
            return view(**kwargs)

    return wrapped_view
