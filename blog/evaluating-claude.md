# Claude 3 for converting screenshots to code

Claude 3 dropped yesterday, claiming to rival GPT-4 on a wide variety of tasks. I maintain a very popular open source project called “screenshot-to-code” (this one!) that uses GPT-4 vision to convert screenshots/designs into clean code. Naturally, I was excited to see how good Claude 3 was at this task.

**TLDR:** Claude 3 is on par with GPT-4 vision for screenshot to code, better in some ways but worse in others.

## Evaluation Setup

I don’t know of a public benchmark for “screenshot to code” so I created simple evaluation setup for the purposes of testing:

- **Evaluation Dataset**: 16 screenshots with a mix of UI elements, landing pages, dashboards and popular websites.
<img width="784" alt="Screenshot 2024-03-05 at 3 05 52 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/c32af2db-eb5a-44c1-9a19-2f0c3dd11ab4">

- **Evaluation Metric**: Replication accuracy, as in “How close does the generated code look to the screenshot?” While there are other metrics that are important like code quality, speed and so on, this is by far the #1 thing most users of the repo care about.
- **Evaluation Mechanism**: Each output is subjectively rated by a human on a rating scale from 0 to 4. 4 = very close to an exact replica while 0 = nothing like the screenshot. With 16 screenshots, the maximum any model can score is 64.


To make the evaluation process easy, I created [a Python script](https://github.com/abi/screenshot-to-code/blob/main/backend/run_evals.py) that runs code for all the inputs in parallel. I also made a simple UI to do a side-by-side comparison of the input and output.

![Google Chrome](https://github.com/abi/screenshot-to-code/assets/23818/38126f8f-205d-4ed1-b8cf-039e81dcc3d0)


## Results

Quick note about what kind of code we’ll be generating: currently, screenshot-to-code supports generating code in HTML + Tailwind, React, Vue, and several other frameworks. Stacks can impact the replication accuracy quite a bit. For example, because Bootstrap uses a relatively restrictive set of user elements, generations using Bootstrap tend to have a distinct "Bootstrap" style.

I only ran the evals on HTML/Tailwind here which is the stack where GPT-4 vision tends to perform the best.

Here are the results (average of 3 runs for each model):

- GPT-4 Vision obtains a score of **65.10%** - this is what we’re trying to beat
- Claude 3 Sonnet receives a score of **70.31%**, which is a bit better.
- Surprisingly, Claude 3 Opus which is supposed to be the smarter and slower model scores worse than both GPT-4 vision and Claude 3 Sonnet, comes in at **61.46%**.

Overall, a very strong showing for Claude 3. Obviously, there's a lot of subjectivity involved in this evaluation but Claude 3 is definitely on par with GPT-4 Vision, if not better.

You can see the [side-by-side comparison for a run of Claude 3 Sonnet here](https://github.com/abi/screenshot-to-code-files/blob/main/sonnet%20results.png). And for [a run of GPT-4 Vision here](https://github.com/abi/screenshot-to-code-files/blob/main/gpt%204%20vision%20results.png).

Other notes:

- The prompts used are optimized for GPT-4 vision. Adjusting the prompts a bit for Claude did yield a small improvement. But nothing game-changing and potentially not worth the trade-off of maintaining two sets of prompts.
- All the models excel at code quality - the quality is usually comparable to a human or better.
- Claude 3 is much less lazy than GPT-4 Vision. When asked to recreate Hacker News, GPT-4 Vision will only create two items in the list and leave comments in this code like `<!-- Repeat for each news item -->` and `<!-- ... other news items ... -->`.
<img width="699" alt="Screenshot 2024-03-05 at 9 25 04 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/04b03155-45e0-40b0-8de0-b1f0b4382bee">

While Claude 3 Sonnet can sometimes be lazy too, most of the time, it does what you ask it to do.

<img width="904" alt="Screenshot 2024-03-05 at 9 30 23 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/b7c7d1ba-47c1-414d-928f-6989e81cf41d">

- For some reason, all the models struggle with side-by-side "flex" layouts
<img width="1090" alt="Screenshot 2024-03-05 at 9 20 58 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/8957bb3a-da66-467d-997d-1c7cc24e6d9a">

- Claude 3 Sonnet is a lot faster
- Claude 3 gets background and text colors wrong quite often! (like in the Hacker News image above)
- My suspicion is that Claude 3 Opus results can be improved to be on par with the other models through better prompting
  
Overall, I'm very impressed with Claude 3 Sonnet for this use case. I've added it as an alternative to GPT-4 Vision in the open source repo (hosted version update coming soon).

If you’d like to contribute to this effort, I have some documentation on [running these evals yourself here](https://github.com/abi/screenshot-to-code/blob/main/Evaluation.md). I'm also working on a better evaluation mechanism with Elo ratings and would love some help on that.
