# Language-aware price formatting

## Changes
- Add one shared formatter to the language provider for MMK amounts.
- Use English digits and “MMK” in English; Myanmar digits and “ကျပ်” in Myanmar.
- Apply it to package prices, wallet balances, header amounts, account balance, and buyer totals.
- Keep USD package display unchanged.

## Validation
- Toggle EN/MM and confirm visible amounts update immediately without reload.
- Check the home header, account, product packages, checkout balance, and Top Buyers.
