# Implementation Plan: Event Pages & Strapi Revamp

## Overview
This plan outlines the steps necessary to enhance the Events feature in the AIRi website. It includes setting up new field structures in Strapi, implementing dynamically generated event slug pages in Next.js, and an .ics calendar endpoint.

## Phase 1: Strapi Schema and Structure Updates
*Priority: High*

We have an `event` content-type in `server/src/api/event`. This was expanded to accommodate the new details.

**1. Update Event Content Type Fields:**
*   **Event Type / Category (category)**: Update the existing enumeration with: conference, workshop, airi_invited_lecture, seminar, roundtable, training, public_debate, research_presentation, networking_event, airi_podcast, talk, event, other.
*   **Format (format)**: Add standard enumeration (onsite, online, hybrid).
*   **Requirements & Access**: Add fields representing the "Registration / Access Information" section.
    *   registrationRequired (Boolean)
    *   registrationUrl (String)
    *   registrationEmail (String)
    *   registrationDeadline (Datetime)
    *   accessConditions (Richtext)
*   **Event Info Card Fields**: Expand location and logistical variables.
    *   locationType (Enumeration: airi_utcn, hub_utcn, online, other)
    *   address (String)
    *   roomOrLink (String)
    *   audience (Enumeration: public, students, researchers, industry, invitation_only)
    *   audienceCustom (String)
    *   language (Enumeration: romanian, english, romanian_english, other)
    *   contactPerson (Relation to api::person.person)
    *   contactName (String)
    *   contactEmail (Email)
    *   partnerInstitutionsText (String)
    *   additionalNotes (Richtext)
    *   privacyNotice (Text)
*   **Image & Media metadata**:
    *   photoCredits (String) to accommodate attribution info.

**2. Participants Structure (`event.participant` Component):**
*   Component Name: `event.participant`
*   Fields:
    *   role (Enumeration: speaker, panelist, trainer, moderator, keynote_speaker, host, organizer, other).
    *   person (Relation to api::person.person).
    *   name (String)
    *   title (String)
    *   bio (Text)
    *   photo (Media)
*   Action: Added `participants` repeatable component to the `event` schema.

## Phase 2: Event Slug Pages Creation (Next.js)
*Priority: High*

**1. Data Fetching helper (`lib/strapi.js`):**
*   [x] Create `getEventBySlug(slug, locale)` helper matching actual Strapi schema (populating heroImage, participants.person, participants.photo, speakers, contactPerson, organizers, partners, body).
*   [x] Ensure `EVENT_FIELDS` and `transformEventData` accurately reflect schema attributes (`roomOrLink`, `partnerInstitutionsText`, etc.).

**2. The Slug Page Component (`web/src/app/news&events/events/[slug]/page.js`):**
*   [x] Implement layout separating the **main content** and the **Event Info Sidebar**.
*   **Main Content Area:**
    *   [x] Featured Image (hero image) and photoCredits.
    *   [x] Event Title, Abstract / Event description (rendered via RichMarkdown).
    *   [x] Speakers & Participants grid with roles, linked profiles, and bios.
    *   [x] Registration & Access conditions block.
    *   [x] Additional Notes block.
    *   [x] Privacy / Recording Notice (custom or default fallback).
*   **Event Info Sidebar:**
    *   [x] Display structured data (Date/Time, Format, Location/Address, Room/Link, Audience, Language, Contact, Registration Deadline).
*   **Share / Actions:**
    *   [x] Add LinkedIn and X share buttons.

## Phase 3: Add to Calendar Functionality (ICS Generation)
*Priority: High*

**1. ICS Endpoint (`web/src/app/api/events/[slug]/ics/route.js`)**
*   [x] Create a Next.js App Router API endpoint.
*   [x] Fetch event data via `getEventBySlug`.
*   [x] Programmatically construct a standard VCARD/ICS format text string including DTSTART, DTEND, SUMMARY, LOCATION, and DESCRIPTION.
*   [x] Return a response with headers: `Content-Type: text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="event-[slug].ics"`.

**2. Download Integration (Client component)**
*   [x] Add to Calendar (.ics) action button in the Event sidebar linking to `/api/events/${event.slug}/ics`.
*   [x] Direct Google Calendar link with populated parameters.

## Phase 4: Remaining UI, Social Media, & Cleanup
*Priority: Low (Tackled Later)*

*   [x] **Google Calendar direct link:** Added URL generation alongside the .ics button.
*   [x] **Listing View Updates:** Wire `/news&events/events` cards to link into the new dynamically generated slug pages (`/news&events/events/[slug]`).
*   [x] Multi-person panels conditionally showing Speaker Bios pulled from person relations or component fields.
