# Hosted Analytics

## TikTok Ads

- Use the **Lead Generation** campaign objective when optimizing TikTok campaigns for signups.
- Select **Complete registration** as the optimization event in TikTok Ads Manager.
- The frontend sends TikTok's standard event code as `CompleteRegistration`; TikTok displays this as `Complete registration` in the UI.
- Use `Purchase` as the paid conversion event for reporting and future optimization once purchase volume is high enough.

## Google Ads

Google Ads registration, checkout started, and purchase conversions are hard-coded in the hosted frontend.

No Google Ads frontend environment variables are required.

The frontend sends:

- Registration conversion after `Signup Completed` using `AW-16649848443/YQQoCIuo9bccEPuMooM-`
- Checkout started conversion after Stripe Checkout session creation using `AW-16649848443/MKvxCLvr9bccEPuMooM-`
- Purchase conversion after the `/checkout-success` redirect using `AW-16649848443/_m-eCM_J37ccEPuMooM-`
