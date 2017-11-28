@echo off

taskkill /im python.exe /f
taskkill /im python.exe /f
taskkill /im python.exe /f

python "%~dp0/web_socket_server.py" %*

pause
