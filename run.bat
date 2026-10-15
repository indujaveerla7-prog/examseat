@echo off
title Exam Seating Auto Allocator Launcher
color 0B
cls
echo =====================================================================
echo          EXAM SEATING AUTO ALLOCATOR - FULL-STACK JAVA
echo =====================================================================
echo.
echo  Please choose how you want to run the project:
echo.
echo  [1] Open Web UI directly in Browser (Instant, zero installation)
echo  [2] Run Standalone Java Server (Requires standard Java JDK)
echo  [3] Run Full Spring Boot Application (Requires Maven)
echo  [4] Exit
echo.
echo =====================================================================
set /p choice="Enter your choice (1, 2, 3, or 4): "

if "%choice%"=="1" goto OPEN_BROWSER
if "%choice%"=="2" goto RUN_JAVA
if "%choice%"=="3" goto RUN_MAVEN
if "%choice%"=="4" goto END

:OPEN_BROWSER
cls
echo Opening Exam Seating Allocator in your web browser...
start index.html
goto END

:RUN_JAVA
cls
echo Checking Java installation...
javac -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 'javac' compiler was not found in your PATH.
    echo Please ensure Java JDK is installed, or use Option [1].
    pause
    goto END
)
echo Compiling ExamSeatingApp.java...
javac -d . ExamSeatingApp.java
if %errorlevel% neq 0 (
    echo [ERROR] Compilation failed.
    pause
    goto END
)
echo Starting Java Server on http://localhost:8080...
start http://localhost:8080
java com.exam.seating.ExamSeatingApp
pause
goto END

:RUN_MAVEN
cls
echo Starting Spring Boot with Maven...
mvn -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Maven ('mvn') is not found in your PATH.
    echo Please install Maven, run from your IDE (IntelliJ/Eclipse), or use Option [1] or [2].
    pause
    goto END
)
mvn spring-boot:run
pause
goto END

:END
exit
