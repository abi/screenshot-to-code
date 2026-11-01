# screenshot-to-code — Guia em português

Este guia complementa o [README original](README.md), que está em inglês. Ele explica como instalar, configurar e usar o screenshot-to-code no Windows, e como reaproveitar o que você produzir em projetos futuros.

> **Sobre este fork:** os arquivos `README-PT.md` e `start.bat` existem apenas neste fork. Como o projeto original não tem arquivos com esses nomes, o botão **Sync fork** do GitHub continua puxando as atualizações sem conflito.

## Sumário

1. [O que a ferramenta faz](#1-o-que-a-ferramenta-faz)
2. [Requisitos](#2-requisitos)
3. [Chaves de API](#3-chaves-de-api)
4. [Instalação no Windows com o start.bat](#4-instalação-no-windows-com-o-startbat)
5. [Instalação manual](#5-instalação-manual)
6. [Instalação com Docker](#6-instalação-com-docker)
7. [Como usar](#7-como-usar)
8. [Reaproveitamento em aplicações futuras](#8-reaproveitamento-em-aplicações-futuras)
9. [Custos](#9-custos)
10. [Configurações avançadas](#10-configurações-avançadas)
11. [Solução de problemas](#11-solução-de-problemas)
12. [Uso responsável](#12-uso-responsável)

---

## 1. O que a ferramenta faz

O screenshot-to-code transforma uma imagem de interface (captura de tela, mockup ou tela do Figma) em código funcional, usando modelos de IA. Também aceita gravações de tela, que viram protótipos interativos.

**Formatos de saída (stacks):**

| Stack | Situação |
|---|---|
| HTML + Tailwind | Estável |
| HTML + CSS | Estável |
| React + Tailwind | Estável |
| Bootstrap | Estável |
| Vue + Tailwind | Beta |
| Ionic + Tailwind | Beta |

**Arquitetura:**

| Componente | Tecnologia | Endereço local |
|---|---|---|
| Backend | Python (FastAPI) | `http://127.0.0.1:7001` |
| Frontend | React (Vite) | `http://localhost:5173` |

---

## 2. Requisitos

| Item | Versão mínima | Download |
|---|---|---|
| Python | 3.10 | https://www.python.org/downloads/ |
| Node.js | 18 (recomendada: LTS) | https://nodejs.org/ |
| Git | qualquer versão recente | https://git-scm.com/download/win |
| Chave de API | ao menos uma (ver seção 3) | — |

> Ao instalar o Python no Windows, marque a opção **"Add python.exe to PATH"**.

O Poetry (gerenciador de pacotes do backend) e o pnpm (do frontend) são instalados automaticamente pelo `start.bat`. Na instalação manual, instale-os conforme a seção 5.

---

## 3. Chaves de API

É obrigatória **ao menos uma** chave entre OpenAI, Anthropic e Gemini. Quanto mais chaves, maior a variedade de modelos que o app combina em cada geração.

| Variável | Obrigatória? | Função | Onde obter |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Uma das três | Modelos Claude | https://console.anthropic.com/ |
| `GEMINI_API_KEY` | Uma das três (fortemente recomendada) | Modelos Gemini; extrai logotipos e imagens reais da captura; **obrigatória para o modo vídeo** | https://aistudio.google.com/ |
| `OPENAI_API_KEY` | Uma das três | Modelos GPT | https://platform.openai.com/api-keys |
| `REPLICATE_API_KEY` | Opcional (recomendada) | Geração e edição de imagens, remoção de fundo | https://replicate.com/ |

**Onde configurar:**

- **Arquivo `backend\.env`:** vale para todas as chaves. O `start.bat` cria esse arquivo na primeira execução.
- **Interface do app (ícone de engrenagem):** aceita as chaves OpenAI, Anthropic e Gemini, que ficam guardadas apenas no navegador. A `REPLICATE_API_KEY` **só funciona** pelo `backend\.env`.

Exemplo de `backend\.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
# OPENAI_API_KEY=
# REPLICATE_API_KEY=
```

> **Segurança:** o arquivo `.env` já está no `.gitignore`. Nunca publique suas chaves em commits, issues ou capturas de tela.

---

## 4. Instalação no Windows com o start.bat

Este é o caminho recomendado.

1. Clone o fork:

   ```bat
   git clone https://github.com/pregocoder/screenshot-to-code.git
   ```

2. Abra a pasta `screenshot-to-code` e dê um duplo clique em **`start.bat`**.

3. Na primeira execução, informe as chaves de API solicitadas. Deixe em branco as que não tiver.

**O que o script faz, em ordem:**

1. Verifica Python (≥ 3.10) e Node.js (≥ 18).
2. Instala Poetry e pnpm, se estiverem ausentes.
3. Cria o `backend\.env`, se ainda não existir.
4. Instala ou atualiza as dependências do backend e do frontend, incluindo o Chromium usado na pré-visualização.
5. Avisa se as portas 7001 ou 5173 já estiverem ocupadas.
6. Abre as janelas **STC backend** e **STC frontend** e, quando o app responder, abre o navegador.

**Uso diário:** para pular a etapa de instalação de dependências, execute num terminal, dentro da pasta do projeto:

```bat
start.bat --rapido
```

> Depois de um **Sync fork**, execute o `start.bat` sem `--rapido` uma vez, para instalar as dependências novas.

**Para encerrar:** feche as janelas **STC backend** e **STC frontend**.

---

## 5. Instalação manual

Use este caminho para desenvolver, depurar ou rodar fora do Windows.

**Backend** (num terminal):

```bash
cd backend
pip install --upgrade poetry
poetry install
poetry run playwright install chromium
poetry run uvicorn main:app --reload --port 7001
```

Crie o arquivo `backend/.env` antes de iniciar, conforme a seção 3.

**Frontend** (em outro terminal):

```bash
cd frontend
npm install -g pnpm
pnpm install
pnpm dev
```

Acesse **http://localhost:5173**.

---

## 6. Instalação com Docker

Com o Docker Desktop instalado, no Prompt de Comando, na raiz do projeto:

```bat
(echo ANTHROPIC_API_KEY=sua-chave)> .env
docker-compose up -d --build
```

> Os parênteses evitam que o Prompt de Comando grave um espaço no fim da chave.

Acesse **http://localhost:5173**. Nesta modalidade, alterações no código exigem um novo `docker-compose up --build`.

> No Docker, o arquivo `.env` fica na **raiz** do projeto, e não em `backend\`.

---

## 7. Como usar

### 7.1 Formas de entrada

A tela inicial oferece quatro abas:

| Aba | Entrada | Observação |
|---|---|---|
| **Upload** | Captura de tela, mockup ou gravação de tela | Forma principal de uso. Aceita arrastar e soltar. |
| **URL** | Endereço de um site | Exige uma chave do serviço **ScreenshotOne**, configurada na engrenagem. Sem ela, faça a captura manualmente e use a aba Upload. |
| **Text** | Descrição textual da interface | Gera uma página a partir de um texto, sem imagem de referência. |
| **Import** | Código HTML existente | Permite continuar editando uma página já gerada ou escrita à mão. |

### 7.2 Fluxo recomendado

1. **Escolha a stack** antes de gerar. Para protótipos rápidos, prefira **HTML + Tailwind**; para integrar a um projeto React, escolha **React + Tailwind**.
2. **Envie a imagem.** Capturas nítidas, em resolução de tela inteira, produzem resultados mais fiéis.
3. **Compare as variantes.** O app gera até quatro versões em paralelo (duas no modo vídeo), cada uma com um modelo diferente. Escolha a mais próxima do esperado.
4. **Refine em linguagem natural.** Use o campo de edição para pedir ajustes, por exemplo: *"aumente o contraste do cabeçalho"* ou *"transforme a tabela em cards no celular"*.
5. **Baixe o código** pelo botão **Download Code** na pré-visualização.

### 7.3 Dicas de qualidade

- Recorte a captura para mostrar só a área de interesse; elementos do navegador (abas, barra de endereço) atrapalham.
- Com a chave do Gemini, o app reaproveita logotipos e imagens reais da captura; sem ela, as imagens são substituídas por marcadores.
- Para telas longas, gere por seções (cabeçalho, corpo, rodapé) e junte depois pela aba **Import**.

---

## 8. Reaproveitamento em aplicações futuras

### 8.1 Sistemas de design

O recurso **Design systems** (na engrenagem) guarda um texto com as suas preferências visuais: cores, fontes, componentes e layout. Ao selecioná-lo antes de gerar, todas as páginas seguem o mesmo padrão, o que garante identidade visual consistente entre projetos.

**Exemplo de descrição para um padrão institucional:**

```
Nome: Padrão técnico institucional

Cores: azul-petróleo #0F4C5C (primária), verde #2A9D8F (sucesso),
âmbar #E9C46A (alerta), vermelho #E76F51 (crítico), cinza #F4F4F4 (fundo).
Fontes: Inter para textos; números tabulares em tabelas e indicadores.
Componentes: cards de indicador (KPI) com valor, unidade e variação;
tabelas zebradas com cabeçalho fixo; gráficos com legenda abaixo.
Layout: menu lateral recolhível, cabeçalho com logotipo à esquerda,
grade de 12 colunas, responsivo para celular.
Idioma: português do Brasil; datas no formato DD/MM/AAAA;
separador decimal vírgula.
```

**Onde os sistemas de design ficam salvos:**

```
%USERPROFILE%\.screenshot-to-code\design-systems.json
```

Faça cópia de segurança desse arquivo para levar os seus padrões a outro computador. Para guardá-lo em outra pasta (por exemplo, uma pasta sincronizada na nuvem), defina a variável de ambiente `SCREENSHOT_TO_CODE_DATA_DIR` no `backend\.env`:

```
SCREENSHOT_TO_CODE_DATA_DIR=C:\Users\SEU_USUARIO\OneDrive\screenshot-to-code
```

### 8.2 Organização dos resultados

Sugestão de estrutura para guardar cada página gerada e reaproveitá-la como ponto de partida:

```
meus-projetos/
└── 2026-11-painel-rsu/
    ├── referencia.png      # captura usada como entrada
    ├── index.html          # código baixado do app
    └── notas.md            # stack, modelo escolhido e ajustes pedidos
```

Para retomar uma página antiga, cole o `index.html` na aba **Import** e continue refinando.

### 8.3 Manter o fork atualizado

O projeto original recebe atualizações frequentes. Para incorporá-las:

1. No GitHub, abra o fork e clique em **Sync fork → Update branch**.
2. No computador, atualize o clone:

   ```bat
   git pull
   ```

3. Execute o `start.bat` sem `--rapido` para instalar as dependências novas.

---

## 9. Custos

O uso das APIs é cobrado por cada provedor, conforme a quantidade de texto e imagens processadas.

- Cada geração cria **várias variantes em paralelo**, e cada uma consome a sua cota.
- O backend aplica um **teto de gasto de US$ 3,00 por variante** em cada geração (`GENERATION_MAX_COST_USD`, em `backend/config.py`). Uma execução que ultrapassaria esse valor é interrompida. Modelos sem preço cadastrado não têm esse limite.
- Acompanhe o consumo nos painéis dos provedores e, se possível, configure limites mensais de gasto em cada um deles.

---

## 10. Configurações avançadas

| Variável | Arquivo | Uso |
|---|---|---|
| `OPENAI_BASE_URL` | `backend\.env` | Usa um proxy ou endpoint compatível com a API da OpenAI. O endereço deve conter `/v1`. |
| `SCREENSHOT_TO_CODE_DATA_DIR` | `backend\.env` | Pasta onde ficam os sistemas de design (seção 8.1). |
| `VITE_WS_BACKEND_URL` | `frontend\.env.local` | Endereço WebSocket do backend. Padrão: `ws://127.0.0.1:7001`. |
| `VITE_HTTP_BACKEND_URL` | `frontend\.env.local` | Endereço HTTP do backend, para quando ele roda em outra máquina ou porta. |
| `BACKEND_PORT` | `.env` da raiz (Docker) | Porta do backend no Docker. Se alterar, ajuste também `VITE_WS_BACKEND_URL`. |

---

## 11. Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Python nao encontrado" no `start.bat` | Python ausente ou fora do PATH | Reinstale o Python marcando **"Add python.exe to PATH"**. |
| Digitar `python` abre a Microsoft Store | Atalho da Store ativo no Windows | Instale o Python pelo site oficial ou desative o atalho em **Configurações → Aplicativos → Aliases de execução de aplicativo**. |
| "Falha ao instalar o pnpm" | O terminal ainda não reconhece o comando recém-instalado | Feche e abra o `start.bat` novamente. Se persistir, execute `npm install -g pnpm` manualmente. |
| Aviso de porta 7001 em uso | Outra instância do backend já está aberta | Feche a janela **STC backend** antiga. |
| Erros de UTF-8 no backend | `.env` salvo em outra codificação | Abra o `.env` no Notepad++ e salve em **Encoding → UTF-8**. |
| O app abre, mas não gera código | Nenhuma chave válida ou sem créditos no provedor | Revise o `backend\.env` ou a engrenagem e confirme o saldo no painel do provedor. |
| A aba URL pede uma chave | Recurso depende do serviço ScreenshotOne | Configure a chave na engrenagem ou use a aba **Upload**. |
| Imagens aparecem como marcadores | Sem `GEMINI_API_KEY` | Adicione a chave do Gemini para extrair as imagens reais. |
| Modo vídeo indisponível | Sem `GEMINI_API_KEY` | O modo vídeo exige a chave do Gemini. |
| "Chromium nao instalado" | Falha no download do navegador de pré-visualização | O app funciona sem ele; para ativar, rode `poetry run playwright install chromium` na pasta `backend`. |

Para outros problemas, consulte o [Troubleshooting.md](Troubleshooting.md) e as [issues do projeto original](https://github.com/abi/screenshot-to-code/issues).

---

## 12. Uso responsável

Usar a estrutura e o layout de um site como **referência de estudo** costuma ser aceitável. Textos, imagens, logotipos e identidade visual de terceiros, porém, são protegidos por direito autoral e por marca registrada (no Brasil, Leis nº 9.610/1998 e nº 9.279/1996). Antes de publicar uma página gerada, substitua esses elementos por conteúdo próprio ou devidamente licenciado.

O projeto é distribuído sob a [licença MIT](LICENSE).
