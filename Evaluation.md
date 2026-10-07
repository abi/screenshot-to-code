## Evaluating models and prompts

Evaluation dataset consists of 16 screenshots. A Python script for running screenshot-to-code on the dataset and a UI for rating outputs is included. With this set up, we can compare and evaluate various models and prompts.

### Running evals

- Input screenshots should be located at `backend/evals_data/inputs` and the outputs will be `backend/evals_data/outputs`. If you want to modify this, modify `EVALS_DIR` in `backend/evals/config.py`. You can download the input screenshot dataset here: TODO.
- Set a stack and model (`STACK` var, `MODEL` var) in `backend/run_evals.py`
- Run `OPENAI_API_KEY=sk-... python run_evals.py` - this runs the screenshot-to-code on the input dataset in parallel but it will still take a few minutes to complete.
- Once the script is done, you can find the outputs in `backend/evals_data/outputs`.

### Rating evals

In order to view and rate the outputs, visit your front-end at `/evals`.

- Rate each output on a scale of 1-4
- You can also print the page as PDF to share your results with others.

Generally, I run three tests for each model/prompt + stack combo and take the average score out of those tests to evaluate.

### Optional: rendered requirements report

Human ratings answer "does this look like the screenshot?". They don't reliably catch a page that looks close but drops or rewrites required copy, or that overflows horizontally on mobile. For eval items where you can state such requirements up front, write them in a JSON file and run:

```bash
cd backend
poetry run python -m evals.requirements_report evals/requirements_examples/requirements.json evals_data/outputs/<folder>/*.html
```

Supported checks: `visible-text` (selector matches one visible element containing the text), `viewport-overflow` (document scrollWidth vs clientWidth), `text-contrast` (WCAG 2.x ratio, only for opaque solid colors; gradients, images and translucent colors are reported `unknown`), and `style-equals` (exact computed value for a small set of typography/color properties). Each check runs at the `desktop` and `mobile` viewports from `preview_screenshot`.

Results are `pass`, `fail`, or `unknown`; `unknown` is never counted as a pass. The exit code is 0 only when every file passes. This is not a visual-similarity score, a quality score, or an accessibility audit, and it doesn't replace the rating UI. `evals/requirements_examples/` has a passing page and a regressed page (rewritten pricing note, fixed-width header that overflows on mobile).
