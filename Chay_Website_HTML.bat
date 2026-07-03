@echo off
echo ====================================================================
echo        KHOI DONG WEBSITE TINH QUAN LY TAI LIEU DAO TAO Y KHOA
echo                      BENH VIEN BACH MAI
echo ====================================================================
echo.
echo Dang khoi chay local server tai cong 8000 va mo trinh duyet...
echo Vui long giu cua so nay de duy tri hoat dong cua website.
echo.
start "" "http://localhost:8000"
python -m http.server 8000
pause
