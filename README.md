
---

# 訂單日曆系統

此系統是一個訂單管理工具，提供日曆視圖來顯示和管理每日的訂單數量。使用者可檢視、查詢、新增以及刪除每日的訂單紀錄，並可按日期排列，方便管理日常訂單。
![image](https://github.com/user-attachments/assets/24eff3ea-4d56-42d2-94ed-911286b4a109)

![image](https://github.com/user-attachments/assets/b37dadb3-7701-4001-8304-8af63fc0577d)


## 功能概述
- **日曆視圖展示訂單數量**：按日顯示訂單數量，方便掌握每日訂單情況。
- **訂單新增與管理**：提供新增、查詢、與刪除訂單的功能。
- **選擇項目與數量**：支援多種項目的訂單管理，可選擇各項目並設定數量。
- **模態框視窗**：透過模態框彈出視窗進行新增與刪除操作，避免頁面重新載入。

## 主要功能

1. **日曆視圖**：提供每月日曆，可查看每一天的訂單數量，並點選特定日期以檢視詳細資訊。
2. **訂單新增功能**：在模態框視窗中輸入訂單號碼、日期、時間、備註和項目明細後，即可新增訂單。
3. **查詢訂單**：透過訂單號碼快速查詢該訂單的詳細內容。
4. **刪除訂單**：提供按鈕，讓使用者可以直接刪除已建立的訂單紀錄。

## 使用方式

1. **啟動應用程式**
   - 使用 Python 執行 `app.py` 程式碼來啟動應用。
   - 系統啟動後，打開瀏覽器，進入指定的 URL 以查看日曆界面。

2. **瀏覽與管理訂單**
   - **切換月份**：點擊「上個月」或「下個月」按鈕來切換月份。
   - **新增訂單**：點擊「新增訂單」按鈕，將彈出新增訂單的模態框，輸入訂單資料後按下「新增」以儲存。
   - **查詢訂單**：在查詢欄輸入訂單號碼，按下「查詢」可查看該訂單的詳細資料。
   - **刪除訂單**：在訂單詳細資料中，點擊「刪除」按鈕即可移除訂單。

3. **顯示每日訂單數量**
   - 點擊日曆中的日期單元格來查看該日的訂單數量。

## 文件與樣式說明

- **calendar.html**：主頁面模板，包含日曆和模態框的 HTML 結構，透過 Jinja2 語法顯示動態內容。
- **style.css**：樣式表，設計整體排版與樣式，包括日曆、按鈕、模態框和表格的 CSS 設定。
  - `body`、`h1`、`table` 等元素的基本樣式設定。
  - 各類按鈕與彈出視窗的樣式設計，優化使用者介面。
- **app.py**：後端邏輯程式碼，負責處理日曆、訂單新增、查詢與刪除的 API 請求。


 **執行應用程式**
   - 於專案目錄中執行以下指令啟動 Flask 應用程式：
     ```bash
     python app.py
     ```

## 注意事項

- 若要更改預設顏色或排版，請編輯 `style.css` 文件。
- 若需更改日期和項目格式，請調整 `calendar.html` 和 `app.py` 中的相關代碼。

--- 
