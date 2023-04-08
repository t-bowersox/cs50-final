from flask import Blueprint, render_template
from . import auth

bp = Blueprint('tasks', __name__)


@bp.route('/')
@auth.login_required
def index():
    return render_template('tasks/index.html.jinja')
