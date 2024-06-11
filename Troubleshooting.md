### Getting an OpenAI API key with GPT-4 model access

You don't need a ChatGPT Pro account. Screenshot to code uses API keys from your OpenAI developer account. In order to get access to the GPT4 Vision model, log into your OpenAI account and then, follow these instructions:

1. Open [OpenAI Dashboard](https://platform.openai.com/)
1. Go to Settings > Billing
1. Click at the Add payment details
<img width="900" alt="285636868-c80deb92-ab47-45cd-988f-deee67fbd44d" src="https://github.com/abi/screenshot-to-code/assets/23818/4e0f4b77-9578-4f9a-803c-c12b1502f3d7">

4. You have to buy some credits. The minimum is $5.
5. Go to Settings > Limits and check at the bottom of the page, your current tier has to be "Tier 1" to have GPT4 access
<img width="900" alt="285636973-da38bd4d-8a78-4904-8027-ca67d729b933" src="https://github.com/abi/screenshot-to-code/assets/23818/8d07cd84-0cf9-4f88-bc00-80eba492eadf">

6. Navigate to OpenAI [api keys](https://platform.openai.com/api-keys) page and create and copy a new secret key.
7. Go to Screenshot to code and paste it in the Settings dialog under OpenAI key (gear icon). Your key is only stored in your browser. Never stored on our servers.

## Still not working?

- Some users have also reported that it can take upto 30 minutes after your credit purchase for the GPT4 vision model to be activated.
- You need to add credits to your account AND set it to renew when credits run out in order to be upgraded to Tier 1. Make sure your "Settings > Limits" page shows that you are at Tier 1.

If you've followed these steps, and it still doesn't work, feel free to open a Github issue. We only provide support for the open source version since we don't have debugging logs on the hosted version. If you're looking to use the hosted version, we recommend getting a paid subscription on screenshottocode.com
