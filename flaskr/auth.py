import functools
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)
from werkzeug.security import check_password_hash, generate_password_hash
from flaskr.db import get_db

bp = Blueprint('auth', __name__, url_prefix='/auth')


@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST' and valid_registration(request.form):
        username = request.form['username']
        password = request.form['password']

        db = get_db()

        try:
            db.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                       [username, generate_password_hash(password)])
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


def login_required(view):
    """Route decorator that requires a user to be logged in."""

    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('auth.login'))

        return view(**kwargs)

    return wrapped_view
