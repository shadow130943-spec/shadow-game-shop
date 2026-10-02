# Finish verified badge and leaderboard photos

## Changes
- Add a reusable Telegram-style verified badge: solid blue circle with a white check.
- Show the badge beside the admin/owner display name on Account and Top Buyers.
- Resolve each leaderboard avatar from the private profile-photo store and render it in owner and ranked-user rows, with initials only when no photo exists or loading fails.

## Validation
- Check the authenticated Account and Top Buyers screens at mobile size.
- Confirm uploaded photos, fallbacks, owner badge placement, and language behavior.
