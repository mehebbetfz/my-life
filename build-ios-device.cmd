@echo off
cd /d "%~dp0"
set CI=
set EAS_SKIP_AUTO_FINGERPRINT=1
echo.
echo === My Life: iOS development build (device) ===
echo Нужен вход в Apple Developer (пароль / 2FA).
echo.
npx.cmd eas-cli@latest build --profile development --platform ios
echo.
pause
