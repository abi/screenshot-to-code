# QA — `image-tools` branch

## Asset handling (new)
- Extracts the right assets from a screenshot — logo, hero image, feature icons (not buttons/text/whole page)
- Extracted crops are pixel-accurate and actually used in the generated page
- Uploaded an exact logo → used verbatim in the output, not redrawn
- `screenshot_preview` — agent renders its own HTML and inspects it
- `edit_image` / `remove_background` accept local asset URLs

## Existing functionality
- Text → code
- Video → code
- Edit / update an existing generation
- Multiple variants generate in parallel

## Across all models
- Tool images reach Gemini, OpenAI, and Claude
- Variant labels (Fast / Max) show correctly

## Running QA efficiently
- **Trust the prompt reports, not the UI.** With `PROMPT_REPORTS_ENABLED=1` + `LOGS_PATH=…`, every LLM request is logged with its tool calls, results, and final HTML — far more reliable to grep than scraping the page. Browse them at `/evals/prompt-reports`.
- **One generation at a time.** Concurrent runs contend on the backend and hit rate limits — run scenarios sequentially.
- **Detect "done" by the chat input returning** (the "Tell the AI what to change…" box), not by scanning page text — its placeholder isn't in `innerText`.
- **Use distinctive, deterministic fixtures** — an unmistakable logo and a clearly-structured screenshot — so you can eyeball whether the right asset was picked.
- **Assets are content-addressed** (`asset_<sha256[:24]>.png`). To prove an exact upload was used, hash the file and look for that filename in the served assets and the generated HTML.
- **Clear reports between scenarios** so each run's reports are easy to attribute.
