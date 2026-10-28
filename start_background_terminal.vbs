Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""c:\Users\hgenc\OneDrive\Desktop\ANTIGRAVITY\terminal_service.ps1"" -Daemon", 0, False
