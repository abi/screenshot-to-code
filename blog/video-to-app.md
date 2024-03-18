
## Capture a screen recording of a web site in action and have the AI build it for you.

* Unlike screenshots, the app will not visually look exactly like the screen recording but it will be functional
* IMPORTANT: This is very experimental and each call is expensive (a few dollars). I would recommend setting up usage limits on your Anthropic account to avoid excess charges.

## Setup

This uses Claude 3 by Anthropic. Add an env var ANTHROPIC_API_KEY to backend/.env with your API key from Anthropic.


## Examples

https://github.com/abi/screenshot-to-code/assets/23818/fe236c1e-ab92-4d84-b63d-e73e5be9a726

## Tips for taking videos

* We extract frames from your video so linger over each feature for a second or two.
