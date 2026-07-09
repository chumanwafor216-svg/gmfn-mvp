# GSN Phone Notification Live Test Checklist

Date: 2026-07-09  
Scope: Browser Web Push phone notifications for GSN.

## Unabated truth

The Render deployment proves the app now has a phone-notification setup surface
and a self-test route. It does not prove a real phone has received a
notification.

This checklist exists to prove the remaining live behaviour on an actual phone.

## What is live now

- Settings screen: `/app/my-gmfn-and-i?tab=settings`
- Frontend control: `Test phone notification`
- Backend route: `POST /web-push/test`
- Deployed commit: `f9099772 Add phone notification self test`
- Frontend Render deploy id: `dep-d97k2umtrd3s7397en60`
- API Render deploy id: `dep-d97k2vi8qa3s73ess4m0`

## What this is not

This is not SMS.

This is not GSM carrier messaging.

This is browser Web Push. It can trigger the phone notification tray when the
phone, browser, operating system, and user permission all allow it.

## Cost position

For the current Web Push path:

- no Twilio subscription is required;
- no SMS credit is required;
- no GSM vendor is required;
- the server still needs the Web Push VAPID keys configured, which are already
  synced through the Render deployment workflow.

If GSN later needs SMS fallback, that becomes a separate paid integration with a
provider such as Twilio, Vonage, MessageBird, or another SMS vendor.

## Test device requirements

Use a real phone, not only desktop.

Minimum:

- signed-in GSN user;
- supported browser;
- notification permission allowed for the GSN site;
- phone notification settings not blocked for that browser;
- stable internet connection;
- battery saver or focus mode not blocking notifications.

Best first test:

- Android phone with Chrome.

More cautious second test:

- iPhone with Safari after adding the site to the Home Screen, because iOS Web
  Push has stricter browser/PWA behaviour.

## Live test steps

1. Open the live app on the phone.

   Use:

   `https://gmfn-frontend.onrender.com/app/my-gmfn-and-i?tab=settings`

2. Sign in.

   Do not test as an anonymous visitor. The push subscription is tied to the
   signed-in user.

3. Find the System notifications section.

   Expected surface:

   - notification setup switch/action;
   - `Test phone notification` button.

4. Turn on System notifications.

   If the browser asks for permission, allow it.

5. Confirm registration feedback.

   Pass message:

   `Phone notifications are on for this device.`

   Failure message:

   `Browser permission is on, but this phone did not register yet.`

6. Tap `Test phone notification`.

7. Watch the phone notification tray.

   Expected notification:

   - title: `GSN test notification`
   - body: `Your phone can receive GSN notifications.`

8. Tap the notification.

   Expected destination:

   `/app/notifications`

## Pass criteria

Phone notification support is proven only if all of these are true:

- the user is signed in;
- the phone registers successfully;
- the `Test phone notification` button returns the success message;
- the phone receives the test notification in the operating-system notification
  tray;
- tapping the notification opens GSN.

## Concern criteria

The path is only partially working if:

- the app says permission is allowed but the phone did not register;
- the test button says no active subscription;
- the notification appears only while the app is open;
- the notification appears on desktop but not on phone;
- Android works but iPhone does not.

These are not frontend polish issues. They usually point to browser support,
permission state, OS notification settings, PWA requirements, or a stale push
subscription.

## Fail criteria

Treat the phone-notification path as not proven if:

- the button is missing on the live settings page;
- the browser cannot grant notification permission;
- registration never succeeds;
- the self-test endpoint fails for a registered user;
- no phone notification appears after a successful test.

## Debug notes

If testing fails, capture:

- phone model;
- operating system version;
- browser name and version;
- whether the app was installed or added to Home Screen;
- exact message shown by the GSN settings screen;
- whether desktop Web Push works for the same account;
- whether the phone has Focus, Do Not Disturb, or battery saver enabled.

## Devil's advocate

Web Push is the right low-cost first path because it uses rails already present
in the product. But it is not as universal as SMS. If the pilot requires
guaranteed reach across all phones, especially users who never grant browser
permission, then GSN will eventually need SMS or WhatsApp fallback.

Do not sell this as guaranteed carrier-level notification until that fallback
exists and is paid for.
