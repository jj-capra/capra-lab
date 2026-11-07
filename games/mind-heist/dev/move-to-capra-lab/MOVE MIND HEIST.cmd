@echo off
setlocal
cd /d "%~dp0"
title Move Mind Heist to Capra Lab
echo.
echo  MOVE MIND HEIST TO CAPRA LAB
echo  Run this once, after Capra Lab's Mind Heist is live.
echo.
echo  Step 1 of 2: copy every Mind Heist player into Capra Lab
echo  (the old site keeps its copy as a backup)
echo.
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 goto failed
node copy-players.mjs
if errorlevel 1 goto failed
echo.
echo  Step 2 of 2: send mind-heist.netlify.app to Capra Lab
echo  Players who open the old address, or an old invite link, land in Capra Lab
echo  still signed in to their own profile. This is one deploy (15 credits).
echo.
pause
cd forward
call npx netlify-cli deploy --prod --no-build --dir . --site mind-heist --message "Mind Heist moved to Capra Lab"
if errorlevel 1 goto failed
echo.
echo  Done. Mind Heist now lives at https://capra-lab.netlify.app/mind-heist/
echo.
pause
exit /b 0

:failed
echo.
echo  Stopped. The old address was NOT switched over. Read the message above, then run this again.
echo.
pause
exit /b 1
