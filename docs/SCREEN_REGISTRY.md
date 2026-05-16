# Screen Registry

Codex must not create unnamed screens.
Every new screen must be added to this registry first.

## Pre-auth Screens

No bottom navigation on these screens.

1. CoverPage
2. WelcomeGuidePage
3. AuthGatewayPage
4. SignInPage
5. OtpVerifyPage
6. SignUpChoicePage
7. StartCommunityPage
8. JoinRequestMembershipPage
9. CommunityCreatedPage
10. JoinRequestSubmittedPage

## Public Verification Screens

No bottom navigation on these screens.

1. TrustSlipVerifyPage
2. CommunityConfirmationOutcomePage
3. CommunityVerifyPage

## Authenticated Screens

Bottom navigation is allowed here.

1. DashboardPage
2. CommunityHomePage
3. OwnerShopControlPage
4. MarketplacePage
5. ShopPage
6. ProfilePage
7. TrustPassportPage
8. TrustEventsPage
9. NotificationsPage
10. CommunityConfirmationInboxPage
11. CommunityConfirmationPolicyPage

## Current Repo Name Notes

The current frontend may still use legacy route/component names while the UX system is being normalized.
When implementing a spec, preserve existing route contracts unless the product owner explicitly approves a rename.

Known current aliases:
- CoverPage may currently be implemented at `frontend/src/pages/CoverPage.tsx`.
- SignInPage may currently be represented by `LoginPage`.
- AuthGatewayPage / SignUpChoicePage may currently be represented by entry or welcome pages.
- OwnerShopControlPage may currently be represented by `ShopControlPage`.
- TrustPassportPage may currently be represented by trust/identity pages.

Alias notes are migration aids, not permission to invent new screens.
