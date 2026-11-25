# Dayfarer

A travel planner where Users plan their trips day by day. This glossary currently covers registration, sessions, email verification, trips with their days, stops and lists, places, and the app's main pages.

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

### Trips

**Trip**:
One journey a User plans in Dayfarer, with a name and, once they're known, the dates it starts and ends.
_Avoid_: Itinerary

**Upcoming trip** / **Ongoing trip** / **Past trip**:
A trip with dates that hasn't started yet, one that is happening today, and one whose end date has gone by.
_Avoid_: Ended trip, finished trip, current trip

**Unscheduled trip**:
A trip that has no dates yet. It has no days until it gets them.
_Avoid_: Undated trip, draft trip

**Day**:
One date of a trip, from its start date to its end date, numbered from 1, where Day 1 is the start date.
_Avoid_: Schedule day

**Stop**:
A place put on a day of a trip: somewhere the traveller has decided to go that day. The same place can be several stops, on different days or on the same one. The interface may say "place", but the domain term is Stop.
_Avoid_: Spot, visit, activity

**Visited**:
A stop the traveller has marked as done. Only stops can be visited.
_Avoid_: Completed, checked in

### Places

**Place**:
An entry in Dayfarer's own list of places, which stops and list places point to.
_Avoid_: Location, venue, attraction

### Lists

**List**:
A group the traveller names on a trip, for places they're considering, notes and checklists.
_Avoid_: Collection, board, section

**List item**:
One thing in a list: a list place, a note or a checklist.
_Avoid_: Entry, card

**List place**:
A place kept in a list because the traveller is considering or bookmarking it, without deciding on a day. Putting it on a day makes a stop, and the list place stays.
_Avoid_: Saved place, candidate, bookmark

**Note**:
A piece of free text kept in a list.

**Checklist**:
A list item made of checklist items to tick off, with an optional title.

**Checklist item**:
One line of a checklist, ticked or not.
_Avoid_: Entry, to-do, task

### Pages

**Trip page**:
The page for one trip, showing its days with their stops, and its lists.
_Avoid_: Itinerary page, trip details

**Trips page**:
The page where a logged-in User sees their trips, grouped as ongoing, upcoming, unscheduled and past. It is also where a User lands after verifying their email.
_Avoid_: Itineraries page, front page, home page, landing page

**Welcome page**:
What a Guest sees at the app's address: what Dayfarer does, and the way to create an account. A logged-in User sees the Trips page there instead.
_Avoid_: Landing page, home page, guest page
