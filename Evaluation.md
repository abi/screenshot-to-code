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
