from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'Lugalbanda'

    # imports views and connects the blueprints from the views.py to the app.
    from .views import views
    app.register_blueprint(views, url_prefix = '/')

    return app