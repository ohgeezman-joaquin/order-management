from flask import Flask, render_template, request, redirect, url_for, jsonify, abort
import sqlite3
from datetime import datetime
import socket
from waitress import serve
import calendar as cal
import json
import os

app = Flask(__name__)

# 資料庫函數
def get_db_connection():
    """建立資料庫連接並返回連接物件"""
    conn = sqlite3.connect('orders.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """如果資料庫不存在則初始化資料庫"""
    conn = get_db_connection()
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
    
    # 創建項目表
    c.execute('''
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )
    ''')
    
    # 檢查是否有預設項目，如果沒有則添加
    c.execute('SELECT COUNT(*) FROM items')
    count = c.fetchone()[0]
    
    if count == 0:
        default_items = [
            "烏Q", "綠Q", "鳳Q", "芋Q", "棗Q", "廣Q",
            "甜凸", "鹹凸", "咖哩凸", "素凸", "小凸",
            "帝酥", "芋酥", "桔酥", "小月", "小廣", "大廣"
        ]
        for item in default_items:
            c.execute('INSERT INTO items (name) VALUES (?)', (item,))
    
    conn.commit()
    conn.close()

def add_order(order_number, date, time, note, items):
    """新增訂單到資料庫"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO orders (order_number, date, time, note, items)
        VALUES (?, ?, ?, ?, ?)
    ''', (order_number, date, time, note, json.dumps(items)))
    conn.commit()
    conn.close()

def get_orders(date):
    """獲取特定日期的所有訂單"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM orders WHERE date = ?', (date,))
    orders = c.fetchall()
    conn.close()
    return orders

def get_order_by_number(order_number):
    """根據訂單號碼獲取訂單"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM orders WHERE order_number = ?', (order_number,))
    orders = c.fetchall()
    conn.close()
    return orders

def get_orders_per_day(year, month):
    """獲取特定月份每天的訂單數量"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT date, COUNT(*) FROM orders WHERE strftime("%Y", date) = ? AND strftime("%m", date) = ? GROUP BY date', 
              (str(year), str(month).zfill(2)))
    orders = c.fetchall()
    conn.close()
    orders_per_day = {int(date.split('-')[2]): count for date, count in orders}
    return orders_per_day

def get_all_items():
    """獲取所有項目"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM items ORDER BY name')
    items = c.fetchall()
    conn.close()
    return items

def add_item(name):
    """添加新項目"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('INSERT INTO items (name) VALUES (?)', (name,))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def delete_item(item_id):
    """刪除項目"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('DELETE FROM items WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()
    return True

# 輔助函數
def generate_calendar(year, month):
    """生成特定月份的日曆資料"""
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

def get_network_ip():
    """獲取本地網路 IP 地址"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except socket.error:
        return "無法確定 IP"

# 路由
@app.route('/')
def index():
    """重定向到當前月份的日曆"""
    today = datetime.today()
    return redirect(url_for('calendar', year=today.year, month=today.month))

@app.route('/calendar/<int:year>/<int:month>')
def calendar(year, month):
    """顯示特定月份的日曆"""
    cal_data = generate_calendar(year, month)
    orders_per_day = get_orders_per_day(year, month)
    items = get_all_items()
    return render_template('calendar.html', year=year, month=month, cal=cal_data, orders_per_day=orders_per_day, items=items)

@app.route('/add', methods=['POST'])
def add():
    """新增訂單"""
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
    """獲取特定日期的所有任務"""
    orders = get_orders(date)
    tasks_list = []
    
    for order in orders:
        items = json.loads(order['items'])
        
        task = {
            'id': order['id'],
            'orderNumber': order['order_number'],
            'date': order['date'],
            'time': order['time'],
            'note': order['note'],
            'items': items
        }
        tasks_list.append(task)
    
    return jsonify(tasks_list)

@app.route('/search_order/<int:order_number>')
def search_order(order_number):
    """根據訂單號碼搜尋訂單"""
    orders = get_order_by_number(order_number)
    
    if not orders:
        return jsonify({"error": "訂單不存在"}), 404
    
    result = []
    for order in orders:
        items = json.loads(order['items'])
        
        result.append({
            'id': order['id'],
            'orderNumber': order['order_number'],
            'date': order['date'],
            'time': order['time'],
            'note': order['note'],
            'items': items
        })
    
    return jsonify(result)

@app.route('/items')
def items():
    """顯示項目管理頁面"""
    items = get_all_items()
    return render_template('items.html', items=items)

@app.route('/api/items', methods=['GET'])
def get_items():
    """獲取所有項目的 API"""
    items = get_all_items()
    return jsonify([{'id': item[0], 'name': item[1]} for item in items])

@app.route('/api/items', methods=['POST'])
def create_item():
    """創建新項目的 API"""
    data = request.json
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'success': False, 'message': '項目名稱不能為空'}), 400
    
    success = add_item(name)
    if success:
        return jsonify({'success': True, 'message': '項目添加成功'}), 201
    else:
        return jsonify({'success': False, 'message': '項目已存在'}), 400

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def remove_item(item_id):
    """刪除項目的 API"""
    success = delete_item(item_id)
    if success:
        return jsonify({'success': True, 'message': '項目刪除成功'}), 200
    else:
        return jsonify({'success': False, 'message': '刪除項目失敗'}), 400

# 獲取指定訂單的詳細資料
@app.route('/get_task/<date>/<time>')
def get_task(date, time):
    try:
        print(f"嘗試獲取訂單: 日期={date}, 時間={time}")
        
        # 檢查數據庫文件是否存在
        if not os.path.exists('orders.db'):
            print("數據庫文件不存在")
            return jsonify({"error": "數據庫不存在"}), 404

        # 連接數據庫
        conn = sqlite3.connect('orders.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 查詢訂單
        cursor.execute('SELECT * FROM orders WHERE date = ? AND time = ?', (date, time))
        order = cursor.fetchone()
        
        if not order:
            print(f"找不到訂單: 日期={date}, 時間={time}")
            return jsonify({"error": "訂單不存在"}), 404
        
        print(f"找到訂單ID: {order['id']}")
        
        # 從 JSON 字符串中解析項目
        items = json.loads(order['items'])
        print(f"解析項目數據: {items}")
        
        # 使物件格式符合前端期望
        formatted_items = []
        for item in items:
            formatted_items.append({
                'item': item['item'],
                'number': item['number']
            })
        
        print(f"找到項目數量: {len(formatted_items)}")
        
        # 組織返回數據
        order_data = {
            'orderNumber': order['order_number'],
            'date': order['date'],
            'time': order['time'],
            'note': order['note'],
            'items': formatted_items
        }
        
        conn.close()
        return jsonify(order_data)
    
    except Exception as e:
        print(f"獲取訂單時發生錯誤: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# 根據ID獲取訂單
@app.route('/get_task_by_id/<int:order_id>')
def get_task_by_id(order_id):
    try:
        print(f"嘗試通過ID獲取訂單: ID={order_id}")
        
        # 檢查數據庫文件是否存在
        if not os.path.exists('orders.db'):
            print("數據庫文件不存在")
            return jsonify({"error": "數據庫不存在"}), 404

        # 連接數據庫
        conn = sqlite3.connect('orders.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 查詢訂單
        cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
        order = cursor.fetchone()
        
        if not order:
            print(f"找不到訂單: ID={order_id}")
            return jsonify({"error": "訂單不存在"}), 404
        
        print(f"找到訂單ID: {order['id']}")
        
        # 從 JSON 字符串中解析項目
        items = json.loads(order['items'])
        print(f"解析項目數據: {items}")
        
        # 使物件格式符合前端期望
        formatted_items = []
        for item in items:
            formatted_items.append({
                'item': item['item'],
                'number': item['number']
            })
        
        print(f"找到項目數量: {len(formatted_items)}")
        
        # 組織返回數據
        order_data = {
            'id': order['id'],
            'orderNumber': order['order_number'],
            'date': order['date'],
            'time': order['time'],
            'note': order['note'],
            'items': formatted_items
        }
        
        conn.close()
        return jsonify(order_data)
    
    except Exception as e:
        print(f"獲取訂單時發生錯誤: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# 更新訂單
@app.route('/update_task', methods=['POST'])
def update_task():
    try:
        data = request.json
        print(f"收到訂單更新請求，訂單ID: {data['id']}")
        
        # 檢查數據庫文件是否存在
        if not os.path.exists('orders.db'):
            print("數據庫文件不存在")
            return jsonify({"error": "數據庫不存在"}), 404

        # 連接數據庫
        conn = sqlite3.connect('orders.db')
        cursor = conn.cursor()
        
        # 開始事務
        cursor.execute('BEGIN TRANSACTION')
        
        # 檢查訂單是否存在
        cursor.execute('SELECT id FROM orders WHERE id = ?', (data['id'],))
        order = cursor.fetchone()
        
        if not order:
            print(f"找不到訂單: ID={data['id']}")
            conn.rollback()
            conn.close()
            return jsonify({"error": "訂單不存在"}), 404
        
        # 將項目數據轉換為 JSON 字符串
        items_json = json.dumps(data['items'])
        
        # 更新訂單
        cursor.execute(
            'UPDATE orders SET date = ?, time = ?, order_number = ?, note = ?, items = ? WHERE id = ?',
            (data['date'], data['time'], data['orderNumber'], data['note'], items_json, data['id'])
        )
        
        # 提交事務
        conn.commit()
        print(f"成功更新訂單ID: {data['id']}")
        conn.close()
        
        return jsonify({"success": True, "message": "訂單已成功更新"})
    
    except Exception as e:
        print(f"更新訂單時發生錯誤: {str(e)}")
        import traceback
        traceback.print_exc()
        # 發生錯誤時回滾事務
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({"error": str(e)}), 500

# 新的基於ID的路由
@app.route('/delete/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    print(f"嘗試刪除訂單 ID: {order_id}")
    success = delete_order_by_id(order_id)
    if success:
        print(f"成功刪除訂單 ID: {order_id}")
        return jsonify({'success': True})
    else:
        print(f"刪除訂單失敗，找不到 ID: {order_id}")
        return jsonify({'success': False}), 404

def delete_order_by_id(order_id):
    """根據 ID 刪除訂單"""
    print(f"在 delete_order_by_id 中，嘗試刪除訂單 ID: {order_id}")
    conn = get_db_connection()
    c = conn.cursor()

    c.execute('SELECT id FROM orders WHERE id = ?', (order_id,))
    order = c.fetchone()
    if not order:
        print(f"在數據庫中找不到訂單 ID: {order_id}")
        conn.close()
        return False
        
    c.execute('DELETE FROM orders WHERE id = ?', (order_id,))
    conn.commit()
    print(f"已成功從數據庫中刪除訂單 ID: {order_id}")
    conn.close()
    return True

if __name__ == '__main__':
    # 初始化資料庫
    init_db()
    
    # 獲取本地網路 IP 地址
    local = get_network_ip()
    port = "8080"
    print("您的網路 IP 地址是:", local + ":" + port)
    
    # 開啟瀏覽器
    import webbrowser
    url = "http://" + local + ":" + port
    webbrowser.open(url)

    # 啟動伺服器
    serve(app, host='0.0.0.0', port=8080)
