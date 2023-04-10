import os
from datetime import datetime
from flask import Flask, jsonify
from . import db, auth, tasks


def create_app(test_config=None):
    """Flask app factory."""

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'todo.db'),
        SESSION_COOKIE_SAMESITE='Lax'
    )

    # Either load a local config from the instance path or (if provided) a test config
    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    # Make the instance path
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Bootstrap the app
    db.init_app(app)
    app.register_blueprint(auth.bp)
    app.register_blueprint(tasks.bp)
    set_error_handlers(app)
    add_template_globals(app)

    return app


def set_error_handlers(app: Flask):
    @app.errorhandler(400)
    def bad_request(err):
        return jsonify('Bad Request'), 400

    @app.errorhandler(401)
    def unauthorized(err):
        return jsonify('Unauthorized'), 401

    @app.errorhandler(404)
    def not_found(err):
        return jsonify('Not Found'), 404

    @app.errorhandler(500)
    def internal_server_error(err):
        return jsonify('Internal Server Error'), 500


def add_template_globals(app: Flask):
    @app.template_global()
    def current_year():
        """Return the current year for the copyright statement."""
        return datetime.today().year
