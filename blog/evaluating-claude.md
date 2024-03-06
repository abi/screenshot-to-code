# Evaluating Claude 3 at converting screenshots to code

[video running both]

Claude 3 dropped yesterday, claiming to rival GPT-4 on a wide variety of tasks. I maintain a very popular open source project (41k+ Github stars) called “screenshot-to-code” (this one!) that uses GPT-4 vision to convert screenshots/designs into clean code. Naturally, I was excited to see how good Claude 3 was at this task!

## Evaluation Setup

I don’t know of a public benchmark for the “screenshot to code” task so I created simple evaluation set up for the purposes of testing\*:

- **Evaluation Dataset**: 16 screenshots with a mix of UI elements, landing pages, dashboards and popular websites.
- **Evaluation Metric**: Replication accuracy, as in “How close does the generated code look to the screenshot?” There are other metrics that are important for sure but this is by far the #1 thing that most developers and users of the repo care about. Each output is subjectively rated by a human (me!) on a rating scale from 0 to 4. 4 = very close to an exact replica while 0 = nothing like the screenshot. With 16 screenshots, the maximum any model can score is 64. I like to compare the percentage of the maximum possible score for each run.

\*I’ve used it mostly for testing prompt variations until now since no model has come close to GPT-4 vision yet.

To make the evaluation process easy, I created [a Python script](https://github.com/abi/screenshot-to-code/blob/main/backend/run_evals.py) that runs code for all the inputs in parallel. I also have a simple UI to do a side-by-side comparison of the input and output, shown below.

[video of input/output]

## Results

Quick note about what kind of code we’ll be generating: currently, screenshot-to-code supports generating code in HTML + Tailwind, React, Vue, and several other frameworks. Stacks can impact the replication accuracy quite a bit. For example, because Bootstrap uses a relatively restrictive set of user elements, generations using Bootstrap tend to have a distinct "Bootstrap" style.

I only ran the evals on HTML/Tailwind here which is the stack where GPT-4 vision tends to perform the best.

Here are the results (average of 3 runs for each model):

- GPT-4 Vision obtains a score of **65.10%** - this is what we’re trying to beat
- Claude 3 Sonnet receives a score of **70.31%**, which is ~7.5% better.
- Surprisingly, Claude 3 Opus which is supposed to be the smarter and slower model scores worse than both GPT-4 vision and Claude 3 Sonnet, coming in at **61.46%**. Strange result.

Overall, a very strong showing for Claude 3! Obviously, there's a lot of subjectivity involved in this evaluation but Claude 3 is definitely on par with GPT-4 Vision, if not better. It's also a lot less lazy than GPT-4 Vision.

You can see the results for a run of Claude 3 Sonnet here. You can see the results for a run of GPT-4 Vision here.

Some other notes:

- The prompts used are optimized for GPT-4 vision. I played around with adjusting the prompts for Claude and that did yield a small improvement. Nothing game-changing and potentially not worth the trade-off of maintaining two sets of prompts.
- All these models excel at code quality - the quality is usually comparable to a human or better
- All the models seem to struggle with side-by-side layouts (the struggle is mostly in seeing, not in implementing) TODO: add iamge
- Claude 3 is much less lazy than GPT-4 Vision. TODO: Hacker News example
- Claude 3 Sonnet is faster and more steerable

Overall, I'm very impressed with Claude 3 Sonnet as a multimodal model for this use case. I've added it as an alternative to GPT-4 Vision in the open source repo (hosted version update coming soon). I'm sure it's possible to get Opus to be quite good as well.

If you’d like to contribute to this effort, I have some documentation on [running these evals yourself here](https://github.com/abi/screenshot-to-code/blob/main/Evaluation.md). If you know of a good tool for running evals like this (image input, code output), it would save me a lot of effort from having to build the tool from scratch.
