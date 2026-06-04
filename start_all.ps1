# ==========================================
# start_all.ps1
# ディベートアリーナの全サーバー起動 ＆ スリープ防止スクリプト
# ==========================================

# 1. PCのスリープを防止するシステムコール
$code = @"
public static class Sleep {
    [System.Runtime.InteropServices.DllImport("kernel32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
    public const uint ES_CONTINUOUS = 0x80000000;
    public const uint ES_SYSTEM_REQUIRED = 0x00000001;
    public const uint ES_DISPLAY_REQUIRED = 0x00000002;
    public static void Prevent() {
        SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED);
    }
}
"@
Add-Type -TypeDefinition $code -Language CSharp
[Sleep]::Prevent()

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " PCのスリープ防止機能を有効化しました" -ForegroundColor Green
Write-Host " このウィンドウを開いている間はPCが落ちません" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 2. バックエンドサーバーを別ウィンドウで起動
Write-Host "バックエンドサーバーを起動中..."
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd backend; python main.py" -WindowStyle Normal

# 3. フロントエンドサーバーを別ウィンドウで起動
Write-Host "フロントエンドサーバーを起動中..."
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host "`n[完了] すべてのサーバーが起動しました！" -ForegroundColor Green
Write-Host "終了する時は、開いたターミナルウィンドウをすべて閉じてください。"

while ($true) { Start-Sleep -Seconds 3600 }
