// 訂單管理系統功能

// 全局變數
let tempOrderData = null;
let editingId = '';
let editingDate = '';
let editingTime = '';

// 基本功能
function changeMonth(offset) {
    const newMonth = window.currentMonth + offset;
    let newYear = window.currentYear;

    if (newMonth < 1) {
        newYear -= 1;
        window.location.href = `/calendar/${newYear}/12`;
    } else if (newMonth > 12) {
        newYear += 1;
        window.location.href = `/calendar/${newYear}/1`;
    } else {
        window.location.href = `/calendar/${newYear}/${newMonth}`;
    }
}

function showInput(day) {
    // 設置日期輸入框
    document.getElementById('date').value = formatDate(window.currentYear, window.currentMonth, day);
    
    // 獲取當天訂單
    fetchTasksForDate(day);
    
    // 標記選中的日期
    document.querySelectorAll('#calendar td').forEach(td => td.classList.remove('selected-day'));
    document.getElementById(`day${day}`).classList.add('selected-day');
}

// 格式化日期
function formatDate(year, month, day) {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// 訂單相關功能
function fetchTasksForDate(day) {
    const date = formatDate(window.currentYear, window.currentMonth, day);

    fetch(`/tasks/${date}`)
        .then(response => response.json())
        .then(tasks => displayTasks(tasks, date))
        .catch(error => {
            console.error('獲取任務時出錯:', error);
            showMessage('獲取訂單資料失敗', 'error');
        });
}

function displayTasks(tasks, date) {
    const taskContent = document.getElementById('taskContent');
    taskContent.innerHTML = '';

    // 顯示日期標頭
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-header';
    dateHeader.innerHTML = `<strong>日期：</strong> ${date}`;
    taskContent.appendChild(dateHeader);

    if (tasks.length === 0) {
        taskContent.innerHTML += '<div class="no-tasks">當天無任何項目。</div>';
        return;
    }

    // 排序訂單（按時間）
    tasks.sort((a, b) => parseInt(a.time.replace(':', '')) - parseInt(b.time.replace(':', '')));

    // 計算每個項目的總數量
    const itemsDict = {};
    tasks.forEach(task => {
        task.items.forEach(item => {
            itemsDict[item.item] = (itemsDict[item.item] || 0) + item.number;
        });
    });

    // 創建訂單容器
    const ordersContainer = document.createElement('div');
    ordersContainer.className = 'task-table';

    // 顯示每個訂單
    tasks.forEach(task => {
        // 創建訂單行
        const orderRow = document.createElement('div');
        orderRow.className = 'task-row';
        
        // 時間單元格
        const timeCell = document.createElement('div');
        timeCell.className = 'task-time-cell';
        timeCell.innerHTML = `
            <div><strong>時間：</strong> ${task.time}</div>
            <div class="task_order_number"><strong>訂單號碼：</strong> ${task.orderNumber}</div>
            <div class="task_note"><strong>備註：</strong> ${task.note || '無'}</div>
            <div class="task-buttons">
                <button onclick="editTask('${task.id}', '${task.date}', '${task.time}')" class="edit-btn"><i class="fas fa-edit"></i> 修改</button>
                <button onclick="deleteTask('${task.id}', '${task.date}', '${task.time}')" class="delete-btn"><i class="fas fa-trash"></i> 刪除</button>
            </div>
        `;
        
        // 項目單元格
        const itemsCell = document.createElement('div');
        itemsCell.className = 'task-items-container';
        itemsCell.innerHTML = task.items.map(item => 
            `<span class="task_item"><strong>項目：</strong> ${item.item} <strong>數量：</strong> ${item.number}</span>`
        ).join('');
        
        // 將單元格添加到行
        orderRow.appendChild(timeCell);
        orderRow.appendChild(itemsCell);
        
        // 將行添加到容器
        ordersContainer.appendChild(orderRow);
    });

    // 顯示項目總計
    if (Object.keys(itemsDict).length > 0) {
        const summaryHeader = document.createElement('h3');
        summaryHeader.textContent = '今日訂單總計';
        summaryHeader.style.marginTop = '20px';
        taskContent.appendChild(summaryHeader);
        
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'summary-container';
        
        for (const item in itemsDict) {
            const itemSummary = document.createElement('div');
            itemSummary.className = 'item_summary';
            itemSummary.innerHTML = `
                <span class="item_prefix">今天</span>
                <span class="item_name"><strong>${item}</strong></span>
                <span class="item_quantity_label">的總數量為:</span>
                <span class="item_quantity_value">${itemsDict[item]}</span>
            `;
            summaryContainer.appendChild(itemSummary);
        }
        
        taskContent.appendChild(summaryContainer);
    }

    taskContent.appendChild(ordersContainer);
}

function deleteTask(id, date, time) {
    if (!confirm("確定要刪除這筆訂單嗎?")) return;
    
    fetch(`/delete/${id}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (response.ok) {
            fetchTasksForDate(date.split('-')[2]);
            showMessage('訂單已成功刪除', 'success');
        } else {
            console.error('刪除任務失敗。');
            showMessage('刪除訂單失敗', 'error');
        }
    })
    .catch(error => {
        console.error('錯誤:', error);
        showMessage('刪除訂單時發生錯誤', 'error');
    });
}

// 表單處理
function submitForm(event) {
    event.preventDefault();
    const formData = new FormData(document.getElementById('taskForm'));

    // 檢查表單是否為空
    if (isFormEmpty(formData)) {
        showMessage('請填寫訂單資料', 'error');
        return;
    }

    // 檢查是否有選擇項目
    const itemNames = formData.getAll('item[]');
    if (!itemNames.some(item => item.trim() !== '')) {
        showMessage('請至少選擇一個項目', 'error');
        return;
    }

    // 準備訂單數據
    const orderData = {
        orderNumber: formData.get('orderNumber'),
        time: formData.get('time'),
        date: formData.get('date'),
        note: formData.get('note'),
        items: []
    };

    // 添加項目
    const numbers = formData.getAll('number[]');
    for (let i = 0; i < itemNames.length; i++) {
        if (itemNames[i]) {
            orderData.items.push({
                item: itemNames[i],
                number: parseInt(numbers[i], 10)
            });
        }
    }

    // 顯示確認對話框
    showOrderConfirmation(orderData);
}

function isFormEmpty(formData) {
    for (const value of formData.values()) {
        if (value.trim() !== '') return false;
    }
    return true;
}

// 確認對話框
function showOrderConfirmation(orderData) {
    // 創建或獲取確認對話框
    let confirmModal = document.getElementById('confirmModal');
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'confirmModal';
        confirmModal.className = 'modal';
        document.body.appendChild(confirmModal);
    }

    // 計算總數量
    let totalItems = 0;
    const itemsHtml = orderData.items.map(item => {
        totalItems += item.number;
        return `
            <div class="confirm-item">
                <span class="item-name">${item.item}</span>
                <span class="item-quantity">${item.number} 個</span>
            </div>
        `;
    }).join('');

    // 設置確認對話框內容
    confirmModal.innerHTML = `
        <div class="modal-content confirm-content">
            <span class="close" onclick="closeConfirmModal()">&times;</span>
            <h2>訂單確認</h2>
            <div class="confirm-details">
                <p><strong>訂單號碼：</strong> ${orderData.orderNumber}</p>
                <p><strong>日期：</strong> ${orderData.date}</p>
                <p><strong>時間：</strong> ${orderData.time}</p>
                <p><strong>備註：</strong> ${orderData.note || '無'}</p>
                <div class="confirm-items">
                    <h3>訂購項目：</h3>
                    ${itemsHtml}
                    <p class="total-items"><strong>總數量：</strong> ${totalItems} 個</p>
                </div>
            </div>
            <div class="confirm-buttons">
                <button onclick="closeConfirmModal()" class="cancel-btn"><i class="fas fa-times"></i> 取消</button>
                <button onclick="submitOrderData()" class="confirm-btn"><i class="fas fa-check"></i> 確認送出</button>
            </div>
        </div>
    `;

    // 儲存訂單資料
    tempOrderData = orderData;

    // 顯示確認對話框
    confirmModal.style.display = 'block';
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.style.display = 'none';
}

function submitOrderData() {
    if (!tempOrderData) {
        console.error('無訂單資料可提交');
        return;
    }

    fetch('/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempOrderData)
    })
    .then(response => {
        if (response.ok) {
            // 顯示成功訊息並重新載入頁面
            showMessage('成功新增訂單', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showMessage('新增訂單失敗', 'error');
        }
    })
    .catch(error => {
        console.error('錯誤:', error);
        showMessage('新增訂單時發生錯誤', 'error');
    });
}

// 模態框操作
function openModal() {
    document.getElementById('myModal').style.display = 'block';
    
    // 預設設定為今天日期
    const today = new Date();
    const dateStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    document.getElementById('date').value = dateStr;
}

function closeModal() {
    document.getElementById('myModal').style.display = 'none';
}

// 項目操作
function addItemRow() {
    const itemsContainer = document.getElementById('itemsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    
    // 創建項目按鈕
    let buttonsHtml = '<label>項目：</label><div class="item-buttons">';
    window.allItems.forEach(item => {
        buttonsHtml += `<button type="button" data-item="${item.name}" onclick="selectItem(this)">${item.name}</button>`;
    });
    buttonsHtml += '</div>';
    
    // 完整的項目行 HTML
    newItemRow.innerHTML = `
        ${buttonsHtml}
        <input type="hidden" name="item[]">
        <div class="quantity-container">
            <label for="number">數量：</label>
            <input type="number" class="number" name="number[]" min="1" required>
        </div>
        <button type="button" class="remove-btn" onclick="removeItemRow(this)"><i class="fas fa-trash"></i> 移除項目</button>
    `;
    
    itemsContainer.insertBefore(newItemRow, itemsContainer.lastElementChild);
}

function selectItem(button) {
    // 獲取所有按鈕和隱藏輸入框
    const itemRow = button.closest('.item-row');
    const allButtons = itemRow.querySelectorAll('button[data-item]');
    const hiddenInput = itemRow.querySelector('input[name="item[]"]');
    
    // 重置所有按鈕
    allButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // 如果點擊的是已選中的按鈕，則取消選擇
    if (button.classList.contains('selected')) {
        button.classList.remove('selected');
        hiddenInput.value = '';
    } else {
        // 否則選中該按鈕
        button.classList.add('selected');
        hiddenInput.value = button.getAttribute('data-item');
    }
}

function removeItemRow(button) {
    button.closest('.item-row').remove();
}

// 搜尋訂單
function searchOrder(event) {
    event.preventDefault();
    const orderNumber = document.getElementById('searchOrderNumber').value;
    
    if (!orderNumber) {
        showMessage('請輸入訂單號碼', 'error');
        return;
    }
    
    fetch('/search_order/' + orderNumber)
        .then(response => response.json())
        .then(orders => {
            const taskContent = document.getElementById('taskContent');
            taskContent.innerHTML = '';
            
            if (!orders || orders.length === 0) {
                taskContent.innerHTML = '<div class="no-result">查無此訂單號碼。</div>';
                showMessage('查無此訂單號碼', 'error');
                return;
            }
            
            // 顯示搜尋結果標題
            const headerTitle = document.createElement('div');
            headerTitle.className = 'search-result-header';
            headerTitle.innerHTML = `
                <h3>搜尋結果</h3>
                <p><strong>找到 ${orders.length} 張訂單號碼為 ${orderNumber} 的訂單</strong></p>
            `;
            taskContent.appendChild(headerTitle);

            // 顯示每一張訂單
            orders.forEach((order, index) => {
                const orderContainer = document.createElement('div');
                orderContainer.className = 'order-container';
                
                // 訂單資訊標頭
                const header = document.createElement('div');
                header.className = 'search-result-order';
                header.innerHTML = `
                    <h4>訂單 #${index + 1}</h4>
                    <p><strong>訂單號碼：</strong> ${order.orderNumber}</p>
                    <p><strong>日期：</strong> ${order.date}</p>
                    <p><strong>時間：</strong> ${order.time}</p>
                    <p><strong>備註：</strong> ${order.note || '無'}</p>
                `;
                orderContainer.appendChild(header);

                // 顯示項目
                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'search-items-container';
                itemsContainer.innerHTML = '<h4>訂購項目：</h4>';
                
                const itemsList = document.createElement('div');
                itemsList.className = 'task-items-container';
                
                order.items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'task_item';
                    itemDiv.innerHTML = `
                        <strong>項目：</strong> ${item.item}
                        <strong>數量：</strong> ${item.number}
                    `;
                    itemsList.appendChild(itemDiv);
                });
                
                itemsContainer.appendChild(itemsList);
                orderContainer.appendChild(itemsContainer);
                
                // 添加編輯和刪除按鈕
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'search-result-buttons';
                buttonsDiv.innerHTML = `
                    <button onclick="editTask('${order.id}', '${order.date}', '${order.time}')" class="edit-btn">
                        <i class="fas fa-edit"></i> 修改
                    </button>
                    <button onclick="deleteTask('${order.id}', '${order.date.split('-')[2]}', '${order.time}')" class="delete-btn">
                        <i class="fas fa-trash"></i> 刪除
                    </button>
                `;
                orderContainer.appendChild(buttonsDiv);
                
                // 添加分隔線，除了最後一個訂單
                if (index < orders.length - 1) {
                    const divider = document.createElement('hr');
                    orderContainer.appendChild(divider);
                }
                
                taskContent.appendChild(orderContainer);
            });

            // 清空輸入欄位
            document.getElementById('searchOrderNumber').value = '';
            
            // 顯示成功訊息
            showMessage(`成功找到 ${orders.length} 張訂單`, 'success');
        })
        .catch(error => {
            console.error('獲取訂單時出錯:', error);
            showMessage('搜尋訂單時發生錯誤', 'error');
        });
}

// 通用功能
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.insertBefore(messageDiv, document.body.firstChild);

    // 3秒後淡出
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 標記今天的日期
    const today = new Date();
    if (today.getFullYear() == window.currentYear && today.getMonth() + 1 == window.currentMonth) {
        const todayCell = document.getElementById(`day${today.getDate()}`);
        if (todayCell) todayCell.classList.add('today');
    }
    
    // 點擊模態框外部時關閉
    window.onclick = function(event) {
        const modal = document.getElementById('myModal');
        const confirmModal = document.getElementById('confirmModal');
        
        if (event.target === modal) closeModal();
        if (confirmModal && event.target === confirmModal) closeConfirmModal();
    };
});

// 修改訂單功能
function editTask(id, date, time) {
    editingId = id;
    editingDate = date;
    editingTime = time;
    
    console.log(`編輯訂單: ID=${id}, 日期=${date}, 時間=${time}`);
    
    // 獲取訂單詳細信息
    fetch(`/get_task_by_id/${id}`)
        .then(response => response.json())
        .then(order => {
            console.log('獲取到訂單詳情:', order);
            
            // 儲存原始訂單資料供比較
            tempOrderData = {
                id: order.id,
                orderNumber: order.orderNumber,
                date: order.date,
                time: order.time,
                note: order.note,
                items: order.items
            };
            
            // 填充表單
            document.getElementById('editOrderNumber').value = order.orderNumber;
            document.getElementById('editDate').value = order.date;
            document.getElementById('editTime').value = order.time;
            document.getElementById('editNote').value = order.note || '';
            
            // 清空項目容器
            const itemsContainer = document.getElementById('editItemsContainer');
            itemsContainer.innerHTML = '';
            
            // 添加項目
            order.items.forEach(item => {
                addEditItemRow(item.item, item.number);
            });
            
            // 顯示模態視窗
            document.getElementById('editModal').style.display = 'block';
        })
        .catch(error => {
            console.error('獲取訂單詳情時出錯:', error);
            showMessage('無法獲取訂單資料', 'error');
        });
}

// 為編輯窗口添加項目行
function addEditItemRow(itemName = '', quantity = '') {
    const itemsContainer = document.getElementById('editItemsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    
    // 創建項目按鈕
    let buttonsHtml = '<label>項目：</label><div class="item-buttons">';
    window.allItems.forEach(item => {
        const isSelected = item.name === itemName;
        buttonsHtml += `<button type="button" data-item="${item.name}" onclick="selectEditItem(this)" class="${isSelected ? 'selected' : ''}">${item.name}</button>`;
    });
    buttonsHtml += '</div>';
    
    // 完整的項目行 HTML
    newItemRow.innerHTML = `
        ${buttonsHtml}
        <input type="hidden" name="editItem[]" value="${itemName}">
        <div class="quantity-container">
            <label for="number">數量：</label>
            <input type="number" class="number" name="editNumber[]" min="1" value="${quantity}" required>
        </div>
        <button type="button" class="remove-btn" onclick="removeEditItemRow(this)"><i class="fas fa-trash"></i> 移除項目</button>
    `;
    
    itemsContainer.appendChild(newItemRow);
}

// 選擇編輯訂單的項目
function selectEditItem(button) {
    const row = button.closest('.item-row');
    
    // 取消其他選中
    row.querySelectorAll('.item-buttons button').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // 標記當前選中
    button.classList.add('selected');
    
    // 設置隱藏輸入值
    row.querySelector('input[name="editItem[]"]').value = button.dataset.item;
}

// 移除編輯項目行
function removeEditItemRow(button) {
    const row = button.closest('.item-row');
    row.remove();
}

// 添加編輯項目
function addEditItem() {
    addEditItemRow();
}

// 關閉編輯窗口
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// 提交修改
function submitEditForm(event) {
    event.preventDefault();
    const formData = new FormData(document.getElementById('editTaskForm'));
    
    // 檢查表單是否為空
    if (isFormEmpty(formData)) {
        showMessage('請填寫訂單資料', 'error');
        return;
    }
    
    // 檢查是否有選擇項目
    const itemNames = formData.getAll('editItem[]');
    if (!itemNames.some(item => item.trim() !== '')) {
        showMessage('請至少選擇一個項目', 'error');
        return;
    }
    
    // 準備訂單數據
    const editedOrder = {
        id: editingId,
        orderNumber: formData.get('editOrderNumber'),
        time: formData.get('editTime'),
        date: formData.get('editDate'),
        note: formData.get('editNote'),
        items: []
    };
    
    // 添加項目
    const numbers = formData.getAll('editNumber[]');
    
    for (let i = 0; i < itemNames.length; i++) {
        if (itemNames[i]) {
            if (isNaN(numbers[i]) || parseInt(numbers[i]) < 1) {
                showMessage(`${itemNames[i]} 的數量必須是大於0的數字`, 'error');
                return;
            }
            
            editedOrder.items.push({
                item: itemNames[i],
                number: parseInt(numbers[i], 10)
            });
        }
    }
    
    // 比較原始訂單和修改後的訂單，檢查是否有變更
    if (tempOrderData) {
        let hasChanges = false;
        
        // 檢查基本信息
        if (tempOrderData.orderNumber !== editedOrder.orderNumber || 
            tempOrderData.date !== editedOrder.date ||
            tempOrderData.time !== editedOrder.time ||
            tempOrderData.note !== editedOrder.note) {
            hasChanges = true;
        }
        
        // 檢查項目數量和內容
        if (!hasChanges && tempOrderData.items.length !== editedOrder.items.length) {
            hasChanges = true;
        }
        
        // 如果數量相同，檢查每個項目
        if (!hasChanges) {
            // 創建映射以便快速查找
            const originalItems = {};
            tempOrderData.items.forEach(item => {
                originalItems[item.item] = item.number;
            });
            
            // 檢查是否有變更
            for (const item of editedOrder.items) {
                if (!originalItems[item.item] || originalItems[item.item] !== item.number) {
                    hasChanges = true;
                    break;
                }
            }
        }
        
        // 如果沒有變更，顯示彈出警告視窗
        if (!hasChanges) {
            // 顯示模態警告視窗
            showNoChangesAlert();
            return;
        }
    }

    // 顯示更新確認視窗
    showUpdateConfirmation(editedOrder);
}

// 顯示無變更警告模態視窗
function showNoChangesAlert() {
    // 創建警告模態視窗
    let alertModal = document.getElementById('noChangesModal');
    if (!alertModal) {
        alertModal = document.createElement('div');
        alertModal.id = 'noChangesModal';
        alertModal.className = 'modal';
        document.body.appendChild(alertModal);
    }
    
    // 設置警告模態視窗內容
    alertModal.innerHTML = `
        <div class="modal-content no-changes-alert">
            <div class="alert-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h2>訂單內容未變更！</h2>
            <p>請修改訂單內容後再提交，或直接點擊關閉按鈕取消修改。</p>
            <div class="alert-buttons">
                <button onclick="closeNoChangesAlert()">我知道了</button>
            </div>
        </div>
    `;
    
    // 顯示警告模態視窗
    alertModal.style.display = 'block';
    
    // 點擊模態視窗背景時也關閉
    alertModal.addEventListener('click', function(event) {
        if (event.target === alertModal) {
            closeNoChangesAlert();
        }
    });
}

// 關閉無變更警告模態視窗
function closeNoChangesAlert() {
    const alertModal = document.getElementById('noChangesModal');
    if (alertModal) {
        alertModal.style.display = 'none';
    }
}

// 顯示更新確認視窗
function showUpdateConfirmation(editedOrder) {
    // 創建或獲取確認對話框
    let confirmModal = document.getElementById('updateConfirmModal');
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'updateConfirmModal';
        confirmModal.className = 'modal';
        document.body.appendChild(confirmModal);
    }

    // 計算總數量
    let totalItems = 0;
    
    // 準備比較數據
    const compareData = {
        orderNumber: {
            original: tempOrderData.orderNumber,
            new: editedOrder.orderNumber,
            changed: tempOrderData.orderNumber !== editedOrder.orderNumber
        },
        date: {
            original: tempOrderData.date,
            new: editedOrder.date,
            changed: tempOrderData.date !== editedOrder.date
        },
        time: {
            original: tempOrderData.time,
            new: editedOrder.time,
            changed: tempOrderData.time !== editedOrder.time
        },
        note: {
            original: tempOrderData.note || '無',
            new: editedOrder.note || '無',
            changed: tempOrderData.note !== editedOrder.note
        },
        items: []
    };
    
    // 創建原始項目映射以便快速查找
    const originalItems = {};
    tempOrderData.items.forEach(item => {
        originalItems[item.item] = item.number;
    });
    
    // 比較項目，判斷哪些是新增的、修改的或原本就有的
    editedOrder.items.forEach(item => {
        totalItems += item.number;
        const originalNumber = originalItems[item.item];
        const status = originalNumber === undefined ? 'added' : 
                      originalNumber !== item.number ? 'modified' : 'unchanged';
        
        // 只添加變更的項目（新增、修改）
        if (status !== 'unchanged') {
            compareData.items.push({
                item: item.item,
                originalNumber: originalNumber || '無',
                newNumber: item.number,
                status: status
            });
        }
        
        // 從原始項目映射中移除，剩下的就是被刪除的項目
        delete originalItems[item.item];
    });
    
    // 先儲存被刪除的項目
    const deletedItems = [];
    for (const itemName in originalItems) {
        deletedItems.push({
            item: itemName,
            originalNumber: originalItems[itemName],
            newNumber: '已刪除',
            status: 'deleted'
        });
    }
    
    // 處理可能的項目名稱變更
    const addedItems = compareData.items.filter(item => item.status === 'added');
    const itemsToRemove = [];
    
    // 優先處理一對一的項目變更情況
    if (addedItems.length === deletedItems.length) {
        // 兩者數量相等，直接一一對應
        for (let i = 0; i < addedItems.length; i++) {
            compareData.items.push({
                originalItem: deletedItems[i].item,
                newItem: addedItems[i].item,
                originalNumber: deletedItems[i].originalNumber,
                newNumber: addedItems[i].newNumber,
                status: 'renamed'
            });
            
            // 標記這些項目為需要移除
            itemsToRemove.push(addedItems[i]);
        }
        
        // 清空已處理的刪除項目
        deletedItems.length = 0;
    } else {
        // 數量不等，嘗試逐一匹配
        addedItems.forEach(addedItem => {
            if (deletedItems.length > 0) {
                const deletedItem = deletedItems[0]; // 始終取第一個
                
                // 添加名稱變更項目
                compareData.items.push({
                    originalItem: deletedItem.item,
                    newItem: addedItem.item,
                    originalNumber: deletedItem.originalNumber,
                    newNumber: addedItem.newNumber,
                    status: 'renamed'
                });
                
                // 標記為需要移除
                itemsToRemove.push(addedItem);
                deletedItems.shift(); // 移除已處理的第一個刪除項目
            }
        });
    }
    
    // 從compareData.items移除已經處理為更名的項目
    compareData.items = compareData.items.filter(item => !itemsToRemove.includes(item));
    
    // 添加剩餘的被刪除項目
    compareData.items = compareData.items.concat(deletedItems);
    
    // 只顯示有變更的基本信息
    const changedBasicInfo = [];
    
    if (compareData.orderNumber.changed) {
        changedBasicInfo.push(`
            <div class="compare-row changed">
                <span class="compare-label">訂單號碼：</span>
                <span class="compare-original">${compareData.orderNumber.original}</span>
                <span class="compare-arrow"><i class="fas fa-arrow-right"></i></span>
                <span class="compare-new">${compareData.orderNumber.new}</span>
            </div>
        `);
    }
    
    if (compareData.date.changed) {
        changedBasicInfo.push(`
            <div class="compare-row changed">
                <span class="compare-label">日期：</span>
                <span class="compare-original">${compareData.date.original}</span>
                <span class="compare-arrow"><i class="fas fa-arrow-right"></i></span>
                <span class="compare-new">${compareData.date.new}</span>
            </div>
        `);
    }
    
    if (compareData.time.changed) {
        changedBasicInfo.push(`
            <div class="compare-row changed">
                <span class="compare-label">時間：</span>
                <span class="compare-original">${compareData.time.original}</span>
                <span class="compare-arrow"><i class="fas fa-arrow-right"></i></span>
                <span class="compare-new">${compareData.time.new}</span>
            </div>
        `);
    }
    
    if (compareData.note.changed) {
        changedBasicInfo.push(`
            <div class="compare-row changed">
                <span class="compare-label">備註：</span>
                <span class="compare-original">${compareData.note.original}</span>
                <span class="compare-arrow"><i class="fas fa-arrow-right"></i></span>
                <span class="compare-new">${compareData.note.new}</span>
            </div>
        `);
    }
    
    // 生成基本信息比較 HTML
    const infoCompareHtml = changedBasicInfo.length > 0 ? 
        `<div class="compare-info">${changedBasicInfo.join('')}</div>` :
        `<div class="no-changes-info">基本資訊未變更</div>`;
    
    // 生成項目比較 HTML
    let itemsCompareHtml = '';
    
    if (compareData.items.length > 0) {
        itemsCompareHtml = compareData.items.map(item => {
            let statusClass = '';
            let statusIcon = '';
            let itemDisplayHtml = '';
            
            switch(item.status) {
                case 'added':
                    statusClass = 'item-added';
                    statusIcon = '<i class="fas fa-plus-circle"></i> 新增';
                    itemDisplayHtml = `
                        <div class="compare-item-details simple-renamed">
                            <div class="compare-item-field">
                                <div class="compare-item-label">項目：</div>
                                <div class="compare-item-value">${item.item}</div>
                            </div>
                            <div class="compare-item-field">
                                <div class="compare-item-label">數量：</div>
                                <div class="compare-item-value">${item.newNumber}</div>
                            </div>
                        </div>
                    `;
                    break;
                case 'modified':
                    statusClass = 'item-modified';
                    statusIcon = '<i class="fas fa-pencil-alt"></i> 數量變更';
                    itemDisplayHtml = `
                        <div class="compare-item-details simple-renamed">
                            <div class="compare-item-field">
                                <div class="compare-item-label">項目：</div>
                                <div class="compare-item-value">${item.item}</div>
                            </div>
                            <div class="compare-item-field">
                                <div class="compare-item-label">原數量：</div>
                                <div class="compare-item-value compare-original">${item.originalNumber}</div>
                            </div>
                            <div class="compare-item-field">
                                <div class="compare-item-label">新數量：</div>
                                <div class="compare-item-value compare-new">${item.newNumber}</div>
                            </div>
                        </div>
                    `;
                    break;
                case 'deleted':
                    statusClass = 'item-deleted';
                    statusIcon = '<i class="fas fa-minus-circle"></i> 刪除';
                    itemDisplayHtml = `
                        <div class="compare-item-details simple-renamed">
                            <div class="compare-item-field">
                                <div class="compare-item-label">項目：</div>
                                <div class="compare-item-value">${item.item}</div>
                            </div>
                            <div class="compare-item-field">
                                <div class="compare-item-label">原數量：</div>
                                <div class="compare-item-value">${item.originalNumber}</div>
                            </div>
                        </div>
                    `;
                    break;
                case 'renamed':
                    statusClass = 'item-renamed';
                    statusIcon = '<i class="fas fa-exchange-alt"></i> 項目變更';
                    
                    // 檢查數量是否也有變更
                    const numberChanged = item.originalNumber !== item.newNumber;
                    const numberChangeText = numberChanged ? 
                        `<div class="compare-item-field compare-item-field-number">
                            <div class="compare-item-label">數量變更：</div>
                            <div class="compare-item-value">
                                <span class="compare-original">${item.originalNumber}</span>
                                <span class="compare-arrow"><i class="fas fa-arrow-right"></i></span>
                                <span class="compare-new">${item.newNumber}</span>
                            </div>
                        </div>` : 
                        `<div class="compare-item-field">
                            <div class="compare-item-label">數量：</div>
                            <div class="compare-item-value">${item.newNumber}</div>
                        </div>`;
                    
                    itemDisplayHtml = `
                        <div class="compare-item-details simple-renamed">
                            <div class="compare-item-field">
                                <div class="compare-item-label">原項目：</div>
                                <div class="compare-item-value compare-original">${item.originalItem}</div>
                            </div>
                            <div class="compare-item-field">
                                <div class="compare-item-label">新項目：</div>
                                <div class="compare-item-value compare-new">${item.newItem}</div>
                            </div>
                            ${numberChangeText}
                        </div>
                    `;
                    break;
            }
            
            return `
                <div class="compare-item ${statusClass}">
                    <div class="compare-item-header">
                        <span class="compare-item-name">${item.status === 'renamed' ? `${item.originalItem} → ${item.newItem}` : item.item}</span>
                        <span class="compare-item-status">${statusIcon}</span>
                    </div>
                    ${itemDisplayHtml}
                </div>
            `;
        }).join('');
    } else {
        itemsCompareHtml = '<div class="no-changes-info">項目未變更</div>';
    }

    // 設置確認對話框內容
    confirmModal.innerHTML = `
        <div class="modal-content confirm-content">
            <span class="close" onclick="closeUpdateConfirmModal()">&times;</span>
            <h2>確認訂單變更</h2>
            <div class="confirm-details">
                <div class="change-section">
                    <h3><i class="fas fa-info-circle"></i> 基本資訊變更</h3>
                    ${infoCompareHtml}
                </div>
                
                <div class="change-section">
                    <h3><i class="fas fa-box"></i> 項目變更</h3>
                    <div class="compare-items-container">
                        ${itemsCompareHtml}
                    </div>
                </div>
                
                <div class="change-summary">
                    <p class="compare-total"><i class="fas fa-calculator"></i> <strong>訂單總量：</strong> ${totalItems} 個</p>
                </div>
            </div>
            <div class="confirm-buttons">
                <button onclick="submitUpdateData(${JSON.stringify(editedOrder).replace(/"/g, '&quot;')})" class="confirm-btn">
                    <i class="fas fa-check"></i> 確認更新
                </button>
                <button onclick="closeUpdateConfirmModal()" class="cancel-btn">
                    <i class="fas fa-times"></i> 取消
                </button>
            </div>
        </div>
    `;
    
    // 顯示確認對話框
    confirmModal.style.display = 'block';
}

// 關閉更新確認對話框
function closeUpdateConfirmModal() {
    const confirmModal = document.getElementById('updateConfirmModal');
    if (confirmModal) {
        confirmModal.style.display = 'none';
    }
}

// 提交更新訂單
function submitUpdateData(editedOrder) {
    console.log('將發送修改請求:', editedOrder);
    
    // 發送修改請求
    fetch('/update_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedOrder)
    })
    .then(response => {
        console.log('收到修改回應:', response.status);
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || '更新訂單失敗');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('修改成功:', data);
        showMessage('成功更新訂單', 'success');
        closeUpdateConfirmModal();
        closeEditModal();
        
        // 重新載入頁面
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    })
    .catch(error => {
        console.error('修改訂單時出錯:', error);
        showMessage('更新訂單時發生錯誤: ' + error.message, 'error');
    });
}

// 確認取消操作
function confirmCancel(type) {
    // 創建警告模態視窗
    let cancelModal = document.getElementById('cancelConfirmModal');
    if (!cancelModal) {
        cancelModal = document.createElement('div');
        cancelModal.id = 'cancelConfirmModal';
        cancelModal.className = 'modal';
        document.body.appendChild(cancelModal);
    }
    
    // 根據類型設置不同的標題（新增或編輯）
    const titleText = type === 'add' ? '取消新增訂單？' : '取消修改訂單？';
    const actionText = type === 'add' ? '新增' : '修改';
    
    // 設置警告模態視窗內容
    cancelModal.innerHTML = `
        <div class="modal-content cancel-confirm-alert">
            <div class="alert-icon"><i class="fas fa-question-circle"></i></div>
            <h2>${titleText}</h2>
            <p>您確定要取消${actionText}訂單嗎？所有未儲存的資料將會遺失。</p>
            <div class="alert-buttons">
                <button onclick="executeCancel('${type}')" class="cancel-confirm-btn">確認取消</button>
                <button onclick="closeCancelConfirm()">返回編輯</button>
            </div>
        </div>
    `;
    
    // 顯示警告模態視窗
    cancelModal.style.display = 'block';
    
    // 點擊模態視窗背景時也關閉
    cancelModal.addEventListener('click', function(event) {
        if (event.target === cancelModal) {
            closeCancelConfirm();
        }
    });
}

// 關閉取消確認模態視窗
function closeCancelConfirm() {
    const cancelModal = document.getElementById('cancelConfirmModal');
    if (cancelModal) {
        cancelModal.style.display = 'none';
    }
}

// 執行取消操作
function executeCancel(type) {
    closeCancelConfirm();
    
    if (type === 'add') {
        closeModal();
        // 重置新增表單
        document.getElementById('taskForm').reset();
    } else if (type === 'edit') {
        closeEditModal();
        // 重置編輯表單
        document.getElementById('editTaskForm').reset();
    }
} 