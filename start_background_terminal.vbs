' =========================================================================
' Bloomberg Terminal - Arka Plan Servis Başlatıcısı (Sessiz Mod)
' =========================================================================
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\hgenc\OneDrive\Desktop\ANTIGRAVITY\BloombergTerminal"

' 1. Port 5173 kontrolü (Zaten açıksa tekrar başlatma)
Set oHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")
On Error Resume Next
oHTTP.Open "GET", "http://localhost:5173", False
oHTTP.setTimeouts 800, 800, 800, 800
oHTTP.Send
isAlreadyRunning = (Err.Number = 0)
On Error Goto 0

' 2. Sunucu henüz çalışmıyorsa sessizce (0 = gizli pencere) arka planda başlat
If Not isAlreadyRunning Then
    WshShell.Run "cmd.exe /c node_modules\.bin\vite.cmd --host --port 5173", 0, False
End If
