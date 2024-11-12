from flask import Flask, render_template, request, redirect, url_for, jsonify, abort
import sqlite3
from datetime import datetime
import socket
from waitress import serve
import calendar as cal
import json

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect('orders.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY,
            order_number TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            note TEXT,
            items TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def add_order(order_number, date, time, note, items):
    conn = sqlite3.connect('orders.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO orders (order_number, date, time, note, items)
        VALUES (?, ?, ?, ?, ?)
    ''', (order_number, date, time, note, json.dumps(items)))
    conn.commit()
    conn.close()

@app.route('/delete/<date>/<time>', methods=['DELETE'])
def delete_order(date, time):
    conn = sqlite3.connect('orders.db')
    c = conn.cursor()

    c.execute('''
        SELECT id FROM orders
        WHERE date = ? AND time = ?
    ''', (date, time))

    order = c.fetchone()
    order_id = order[0]

    c.execute('''
        DELETE FROM orders
        WHERE id = ?
    ''', (order_id,))
    conn.commit()
    conn.close()
    return '', 204

def get_orders(date):
    conn = sqlite3.connect('orders.db')
    c = conn.cursor()
    c.execute('SELECT * FROM orders WHERE date = ?', (date,))
    orders = c.fetchall()
    conn.close()
    return orders

def get_order_by_number(order_number):
    conn = sqlite3.connect('orders.db')
    c = conn.cursor()
    c.execute('SELECT * FROM orders WHERE order_number = ?', (order_number,))
    order = c.fetchone()
    conn.close()
    return order

def get_orders_per_day(year, month):
    conn = sqlite3.connect('orders.db')
    c = conn.cursor()
    c.execute('SELECT date, COUNT(*) FROM orders WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ? GROUP BY date', (str(year), str(month).zfill(2)))
    orders = c.fetchall()
    conn.close()
    orders_per_day = {int(date.split('-')[2]): count for date, count in orders}
    return orders_per_day

def generate_calendar(year, month):
    first_day_of_month, num_days = cal.monthrange(year, month)
    weeks = [[]]
    day_counter = 1 - first_day_of_month
    while day_counter <= num_days:
        week = []
        for _ in range(7):
            if day_counter < 1 or day_counter > num_days:
                week.append(0)
            else:
                week.append(day_counter)
            day_counter += 1
        weeks.append(week)
    return weeks

@app.route('/')
def index():
    today = datetime.today()
    return redirect(url_for('calendar', year=today.year, month=today.month))

@app.route('/calendar/<int:year>/<int:month>')
def calendar(year, month):
    cal_data = generate_calendar(year, month)
    orders_per_day = get_orders_per_day(year, month)
    return render_template('calendar.html', year=year, month=month, cal=cal_data, orders_per_day=orders_per_day)

@app.route('/add', methods=['POST'])
def add():
    data = request.json
    order_number = data['orderNumber']
    date = data['date']
    time = data['time']
    note = data['note']
    items = data['items']
    add_order(order_number, date, time, note, items)
    return '', 204

@app.route('/tasks/<date>')
def tasks(date):
    orders = get_orders(date)
    tasks = [{
        'orderNumber': order[1],
        'date': order[2],
        'time': order[3],
        'note': order[4],
        'items': json.loads(order[5])
    } for order in orders]
    return jsonify(tasks)

@app.route('/search_order/<int:order_number>')
def search_order(order_number):
    order = get_order_by_number(order_number)
    if order:
        result = {
            'orderNumber': order[1],
            'date': order[2],
            'time': order[3],
            'note': order[4],
            'items': json.loads(order[5])
        }
    else:
        result = None
    return jsonify(result)

def get_network_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except socket.error:
        return "Could not determine IP"

if __name__ == '__main__':
    init_db()
    local = get_network_ip()
    port = "5050"
    print("Your network IP address is:", local + ":" + port)
    
    import webbrowser
    url = "http://" + local + ":" + port
    webbrowser.open(url)

    serve(app, host='0.0.0.0', port=5050)
