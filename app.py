from website import create_app
app = create_app()

# debug

if __name__ == '__main__':
    app.run(debug = True)