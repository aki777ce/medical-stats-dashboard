/**
 * テーブル管理関連の機能
 */

/**
 * テーブルを更新する関数
 * @param {Array} filteredData - フィルタリングされたデータ
 */
function updateTable(filteredData) {
    const tbody = document.getElementById('data-tbody');
    tbody.innerHTML = '';
    
    // 平日日勤帯のみ表示するかどうかを確認
    const workdayOnlyToggle = document.getElementById('workday-only-toggle').checked;
    
    // 表示するデータを選択
    let displayData = [...filteredData];
    if (workdayOnlyToggle) {
        displayData = displayData.filter(item => item.workdayHours > 0);
    }
    
    // テーブルにデータを追加
    displayData.forEach(item => {
        const row = document.createElement('tr');
        
        // 日付
        const dateCell = document.createElement('td');
        dateCell.textContent = item.date;
        row.appendChild(dateCell);
        
        // ストップ科
        const deptCell = document.createElement('td');
        deptCell.textContent = item.department;
        row.appendChild(deptCell);
        
        // 停止時間
        const timeCell = document.createElement('td');
        timeCell.textContent = item.timeRange;
        row.appendChild(timeCell);
        
        // 理由
        const reasonCell = document.createElement('td');
        reasonCell.textContent = item.reason;
        row.appendChild(reasonCell);
        
        // 平日日勤帯時間
        const workdayCell = document.createElement('td');
        
        // 時間分形式に変換する関数
        const formatHoursAndMinutes = (hours) => {
            if (!hours || hours <= 0) return '';
            
            const totalHours = Math.floor(hours);
            const minutes = Math.round((hours - totalHours) * 60);
            
            if (totalHours === 0) {
                return `${minutes}分`;
            } else if (minutes === 0) {
                return `${totalHours}時間`;
            } else {
                return `${totalHours}時間${minutes}分`;
            }
        };
        
        const displayValue = formatHoursAndMinutes(item.workdayHours);
        
        console.log('平日日勤帯時間データ:', JSON.stringify({
            date: item.date ? (typeof item.date.format === 'function' ? item.date.format('YYYY-MM-DD') : item.date) : null,
            timeRange: item.timeRange,
            workdayHours: item.workdayHours,
            isNumber: typeof item.workdayHours === 'number',
            display: displayValue
        }));
        
        workdayCell.textContent = displayValue;
        row.appendChild(workdayCell);
        
        tbody.appendChild(row);
    });
}

/**
 * CSVエクスポート機能
 * @param {Array} filteredData - フィルタリングされたデータ
 */
function exportToCsv(filteredData) {
    const workdayOnlyToggle = document.getElementById('workday-only-toggle').checked;
    let exportData = [...filteredData];
    
    if (workdayOnlyToggle) {
        exportData = exportData.filter(item => item.workdayHours > 0);
    }
    
    if (exportData.length === 0) {
        alert('エクスポートするデータがありません');
        return;
    }
    
    // CSVヘッダー
    let csv = '日付,ストップ科,停止時間,理由,平日日勤帯時間\n';
    
    // データ行
    exportData.forEach(item => {
        const workdayHours = item.workdayHours > 0 ? item.workdayHours.toFixed(1) : '';
        csv += `${item.date},${item.department},${item.timeRange},${item.reason},${workdayHours}\n`;
    });
    
    // CSVファイルをダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '医療統計データ.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// グローバルスコープに関数をエクスポート
window.TableManager = {
    updateTable,
    exportToCsv
};
