Set Shell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

Root = FSO.GetParentFolderName(WScript.ScriptFullName)
ScriptPath = Root & "\scripts\flora-start-windows.ps1"

Command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & ScriptPath & Chr(34)

Shell.Run Command, 0, False
