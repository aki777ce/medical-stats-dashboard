/**
 * イベントハンドラー関連の機能
 */

// グローバルデータへの参照を保持する変数
// 常に最新のデータを使用するための参照を保持

/**
 * 平日日勤帯のみ表示トグルのイベントハンドラーを設定
 * @param {Function} getFilteredData - 最新のフィルタリングされたデータを取得する関数
 */
function setupWorkdayToggleHandler(getFilteredData) {
    document.getElementById('workday-only-toggle').addEventListener('change', function() {
        // 最新のデータを取得
        const currentFilteredData = getFilteredData();
        // TableManagerのupdateTable関数を呼び出す
        window.TableManager.updateTable(currentFilteredData);
    });
}

/**
 * CSVエクスポートボタンのイベントハンドラーを設定
 * @param {Function} getFilteredData - 最新のフィルタリングされたデータを取得する関数
 */
function setupExportHandler(getFilteredData) {
    document.getElementById('export-csv').addEventListener('click', function() {
        // 最新のデータを取得
        const currentFilteredData = getFilteredData();
        // TableManagerのexportToCsv関数を呼び出す
        window.TableManager.exportToCsv(currentFilteredData);
    });
}

// グローバルスコープに関数をエクスポート
window.EventHandlers = {
    setupWorkdayToggleHandler,
    setupExportHandler
};
