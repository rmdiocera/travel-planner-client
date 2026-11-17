# Dayfarer

A travel planner where users build itineraries made of places. This glossary currently covers registration, sessions and email verification.

## Language

### Accounts

**User**:
A person who has registered with Dayfarer. The interface may say "account" (as in "Create account"), but the domain term is User.
_Avoid_: Member, customer, account holder

**Registration**:
Becoming a User by submitting a name, an email address and a password. It leaves the new User logged in but unverified.
_Avoid_: Sign up

**Log in** / **Log out**:
Starting and ending a User's session.
_Avoid_: Sign in, sign out

**Session**:
The time a User stays logged in on one browser, from log in until they log out or it expires.
_Avoid_: Token

**Guest**:
Anyone who is not logged in, whether or not they have registered.
_Avoid_: Visitor, anonymous user

### Email verification

**Verified user**:
A User who has confirmed ownership of their email address by following a verification link.
_Avoid_: Confirmed user, activated user

**Unverified user**:
A User who has not yet confirmed their email address. They can reach only the verify-email page and log out.
_Avoid_: Pending user, inactive user

**Verification email**:
The email sent to a User's address that contains a verification link. It is sent at registration and again each time the User resends it.
_Avoid_: Confirmation email, activation email

**Verification link**:
The link in a verification email. Following it verifies the User; it expires after 60 minutes, and an expired or tampered link verifies no one.
_Avoid_: Confirmation link, activation link

**Verify-email page**:
The page that holds an unverified User, telling them to check their email and letting them resend the verification email.
_Avoid_: Verify page, verification page

**Resend cooldown**:
The five-minute wait after a User resends the verification email before they may resend again, shown to them as a countdown.
_Avoid_: Timeout, throttle, rate limit

### Pages

**Itineraries page**:
The app's home page, where a logged-in User sees their itineraries. It is also where a User lands after following a verification link.
_Avoid_: Front page, home page, landing page
