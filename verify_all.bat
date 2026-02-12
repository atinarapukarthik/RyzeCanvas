@echo off
echo ===================================
echo RyzeCanvas Verification Script
echo ===================================

echo [1/2] verifying Frontend Tests...
cd frontend
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend Tests Failed!
    exit /b 1
)
cd ..

echo [2/2] verify Backend Tests...
cd backend
if exist "venv" (
    call venv\Scripts\activate.bat
) else (
    if exist "venv_test" (
        call venv_test\Scripts\activate.bat
    ) else (
        echo ⚠️  Backend venv not found. Please setup environment first.
        exit /b 1
    )
)
python -m pytest -v
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend Tests Failed!
    exit /b 1
)
cd ..

echo ===================================
echo ✅ All Tests Passed! System is Perfect.
echo ===================================
