# Complete language, avatar, and email-change updates

## Scope
- Move customer-facing text on shop, authentication, order history, add funds, deposit history, checkout, notifications, account, and profile screens into the existing EN/MM language system.
- Ensure titles, dialogs, placeholders, buttons, validation messages, status labels, and currency digits update immediately when language changes.
- Rename account/profile contact labels from Phone to Email and show the authenticated email.
- Cache signed avatar URLs by storage path and preload the authenticated user's avatar before the account/profile UI leaves its loading state.
- Add a secure email-change flow: accept a new email, send OTP only to the current authenticated email, validate the OTP on the backend, update the authentication email, and then synchronize the profile contact value.

## Security and validation
- Validate names, emails, passwords, and OTP codes on both the client and the backend proxy with Zod.
- Never send the OTP provider key to the browser.
- Derive the old email from the authenticated backend session rather than trusting a browser-supplied address.
- Require a valid 6-digit OTP before any email update.

## Verification
- Check EN and Myanmar rendering on the requested pages and checkout dialog.
- Verify avatar loading behavior for authenticated pages.
- Test email-change validation/error states and confirm the project builds cleanly.
