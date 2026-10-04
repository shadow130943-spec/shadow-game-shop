# Project Architecture Rules

- All user-facing copy on shared shop, navigation, account, profile, and leaderboard screens must use `LanguageProvider`, so language changes render immediately without reloads.
- Authenticated email changes must be performed by the `auth-otp` function after verifying an OTP sent to the session user's current email, so clients cannot choose the verification address.