@echo off
rem ==========================================================================
rem  screenshot-to-code - inicializador para Windows
rem
rem  Uso: coloque este arquivo na raiz do repositorio e de um duplo clique.
rem
rem  O script:
rem    1. verifica Python (>= 3.10) e Node.js (>= 18);
rem    2. instala Poetry e pnpm, se estiverem ausentes;
rem    3. cria backend\.env (pede a chave de API na primeira execucao);
rem    4. instala/atualiza as dependencias do backend e do frontend;
rem    5. abre o backend (porta 7001) e o frontend (porta 5173) em janelas
rem       separadas e abre o navegador quando o app estiver pronto.
rem
rem  Para encerrar, feche as janelas "STC backend" e "STC frontend".
rem
rem  Opcoes:
rem    start.bat --rapido   pula a instalacao de dependencias (uso diario)
rem ==========================================================================

setlocal EnableExtensions
title screenshot-to-code - inicializador
cd /d "%~dp0"
set "ROOT=%~dp0"
set "BACKEND_PORT=7001"
set "FRONTEND_PORT=5173"
set "RAPIDO=0"
if /i "%~1"=="--rapido" set "RAPIDO=1"

if not exist "%ROOT%backend\pyproject.toml" (
    echo [ERRO] Execute este arquivo na raiz do repositorio screenshot-to-code.
    goto :falha
)

echo.
echo ==========================================================
echo   screenshot-to-code - inicializacao no Windows
echo ==========================================================
echo.

rem --------------------------------------------------------------------------
rem 1. Python
rem --------------------------------------------------------------------------
set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY (
    python --version >nul 2>&1 && set "PY=python"
)
if not defined PY (
    echo [ERRO] Python nao encontrado.
    echo        Instale o Python 3.10 ou superior em https://www.python.org/downloads/
    echo        e marque a opcao "Add python.exe to PATH" durante a instalacao.
    goto :falha
)
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 (
    echo [ERRO] E necessario Python 3.10 ou superior. Versao encontrada:
    %PY% --version
    goto :falha
)
for /f "delims=" %%v in ('%PY% --version 2^>^&1') do echo [OK] %%v

rem --------------------------------------------------------------------------
rem 2. Node.js
rem --------------------------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo        Instale a versao LTS em https://nodejs.org/
    goto :falha
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)"
if errorlevel 1 (
    echo [ERRO] E necessario Node.js 18 ou superior. Versao encontrada:
    node --version
    goto :falha
)
for /f "delims=" %%v in ('node --version') do echo [OK] Node.js %%v

rem --------------------------------------------------------------------------
rem 3. Poetry e pnpm
rem --------------------------------------------------------------------------
%PY% -m poetry --version >nul 2>&1
if errorlevel 1 (
    echo [..] Instalando Poetry...
    %PY% -m pip install --user --upgrade poetry
    %PY% -m poetry --version >nul 2>&1
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar o Poetry.
        goto :falha
    )
)
echo [OK] Poetry disponivel

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [..] Instalando pnpm...
    call npm install -g pnpm@10
    where pnpm >nul 2>&1
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar o pnpm. Feche e reabra este script;
        echo        se persistir, execute "npm install -g pnpm" manualmente.
        goto :falha
    )
)
echo [OK] pnpm disponivel

rem --------------------------------------------------------------------------
rem 4. Chaves de API (backend\.env)
rem --------------------------------------------------------------------------
if exist "%ROOT%backend\.env" (
    echo [OK] backend\.env encontrado
) else (
    call :criar_env
)

rem --------------------------------------------------------------------------
rem 5. Dependencias
rem --------------------------------------------------------------------------
if "%RAPIDO%"=="1" (
    echo [..] Modo rapido: instalacao de dependencias ignorada
) else (
    call :instalar_dependencias
    if errorlevel 1 goto :falha
)

rem --------------------------------------------------------------------------
rem 6. Portas
rem --------------------------------------------------------------------------
call :porta_em_uso %BACKEND_PORT%
if not errorlevel 1 (
    echo [AVISO] A porta %BACKEND_PORT% ja esta em uso. Talvez o backend ja esteja aberto.
    echo         Feche a janela antiga ou encerre o processo antes de continuar.
    pause
)
call :porta_em_uso %FRONTEND_PORT%
if not errorlevel 1 (
    echo [AVISO] A porta %FRONTEND_PORT% ja esta em uso. O Vite tentara a proxima porta livre.
)

rem --------------------------------------------------------------------------
rem 7. Inicializacao
rem --------------------------------------------------------------------------
echo.
echo [..] Iniciando backend em http://127.0.0.1:%BACKEND_PORT%
start "STC backend" /D "%ROOT%backend" cmd /k %PY% -m poetry run uvicorn main:app --reload --port %BACKEND_PORT%

echo [..] Iniciando frontend em http://localhost:%FRONTEND_PORT%
start "STC frontend" /D "%ROOT%frontend" cmd /k pnpm dev

echo [..] Aguardando o frontend responder (ate 90 s)...
set /a TENTATIVAS=0
:aguardar
set /a TENTATIVAS+=1
curl -s -o nul "http://localhost:%FRONTEND_PORT%" >nul 2>&1
if not errorlevel 1 goto :pronto
if %TENTATIVAS% geq 45 goto :sem_resposta
timeout /t 2 /nobreak >nul
goto :aguardar

:pronto
echo [OK] Aplicacao pronta. Abrindo o navegador...
start "" "http://localhost:%FRONTEND_PORT%"
goto :fim

:sem_resposta
echo [AVISO] O frontend nao respondeu a tempo. Verifique a janela "STC frontend"
echo         e abra manualmente http://localhost:%FRONTEND_PORT%
goto :fim

rem ==========================================================================
rem  Sub-rotinas
rem ==========================================================================

:criar_env
echo.
echo Primeira execucao: configure ao menos uma chave de API.
echo Deixe em branco para pular; as chaves OpenAI, Anthropic e Gemini tambem
echo podem ser informadas depois no app (icone de engrenagem).
echo.
set "K_ANTHROPIC="
set "K_GEMINI="
set "K_OPENAI="
set "K_REPLICATE="
set /p "K_ANTHROPIC=ANTHROPIC_API_KEY (console.anthropic.com): "
set /p "K_GEMINI=GEMINI_API_KEY    (aistudio.google.com)  : "
set /p "K_OPENAI=OPENAI_API_KEY    (platform.openai.com)  : "
set /p "K_REPLICATE=REPLICATE_API_KEY (replicate.com)        : "
(
    echo # Chaves de API do screenshot-to-code. Nao versione este arquivo.
    call :linha_env ANTHROPIC_API_KEY K_ANTHROPIC
    call :linha_env GEMINI_API_KEY K_GEMINI
    call :linha_env OPENAI_API_KEY K_OPENAI
    call :linha_env REPLICATE_API_KEY K_REPLICATE
) > "%ROOT%backend\.env"
echo [OK] backend\.env criado. Edite-o no Bloco de Notas para alterar as chaves.
exit /b 0

:linha_env
rem %1 = nome da variavel no .env, %2 = nome da variavel local com o valor
if defined %2 (
    call echo %1=%%%2%%
) else (
    echo # %1=
)
exit /b 0

:instalar_dependencias
echo.
echo [..] Instalando dependencias do backend (a primeira vez pode demorar)...
pushd "%ROOT%backend"
%PY% -m poetry install
if errorlevel 1 (
    popd
    echo [ERRO] Falha no "poetry install".
    exit /b 1
)
echo [..] Instalando o Chromium usado na pre-visualizacao...
%PY% -m poetry run playwright install chromium
if errorlevel 1 echo [AVISO] Chromium nao instalado; a pre-visualizacao ficara desativada.
popd

echo [..] Instalando dependencias do frontend...
pushd "%ROOT%frontend"
call pnpm install
if errorlevel 1 (
    popd
    echo [ERRO] Falha no "pnpm install".
    exit /b 1
)
popd
echo [OK] Dependencias instaladas
exit /b 0

:porta_em_uso
rem Retorna errorlevel 0 se a porta %1 estiver em escuta.
netstat -ano -p tcp | findstr /r /c:":%1 .*LISTENING" >nul
exit /b %errorlevel%

:falha
echo.
echo A inicializacao foi interrompida.
pause
endlocal
exit /b 1

:fim
echo.
echo Para encerrar, feche as janelas "STC backend" e "STC frontend".
echo Esta janela pode ser fechada.
pause
endlocal
exit /b 0
