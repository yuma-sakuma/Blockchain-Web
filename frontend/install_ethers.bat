@echo off
echo Starting npm install... >> install_log.txt
npm install >> install_log.txt 2>&1
if %errorlevel% neq 0 (
    echo npm install failed >> install_log.txt
) else (
    echo npm install succeeded >> install_log.txt
)
