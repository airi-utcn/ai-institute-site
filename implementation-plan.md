# Implementation Plan: Event Pages & Strapi Revamp

## Overview
This plan outlines the steps necessary to enhance the Events feature in the AIRi website. It includes setting up new field structures in Strapi, implementing dynamically generated event slug pages in Next.js, and an .ics calendar endpoint.

## Phase 1: Strapi Schema and Structure Updates
*Priority: High*

We currently have an vent content-type in server/src/api/event. This needs to be expanded to accommodate the new details.

**1. Update vent Content Type Fields:**
*   **Event Type / Category (category)**: Update the existing enumeration with: conference, workshop, iri_invited_lecture, seminar, oundtable, 	raining, public_debate, esearch_presentation, 
etworking_event, iri_podcast.
*   **Format (ormat)**: Add standard enumeration (onsite, online, hybrid).
*   **Requirements & Access**: Add fields representing the "Registration / Access Information" section.
    *   egistrationRequired (Boolean)
    *   egistrationLinkOrEmail (String)
    *   egistrationDeadline (Datetime)
    *   ccessConditions (Text)
*   **Event Info Card Fields**: Expand location and logistical variables.
    *   locationType (Enumeration: iri_at_utcn, hub_utcn, online, other)
    *   ddress (String)
    *   oomOrPlatformLink (String)
    *   udience (JSON/Array of strings or Enum: public, students, esearchers, industry, invitation_only)
    *   language (Enumeration: omanian, nglish, multiple)
    *   contactEmail (String)
    *   partnerInstitutions (Text or Relation to partners)
    *   dditionalNotes (Text)
*   **Image & Media metadata**:
    *   photoCredits (String) to accommodate attribution info.

**2. Participants Structure (vent-participant Component):**
Currently, the schema uses basic relations (speakers and organizers). To accommodate exact roles ("Speaker", "Panelist", "Trainer", "Moderator", "Keynote Speaker", "Host", "Organizer"), we will create a new generic Strapi Component:
*   Component Name: shared.event-participant
*   Fields:
    *   ole (Enumeration: speaker, panelist, 	rainer, moderator, keynote_speaker, host, organizer).
    *   person (Relation to pi::person.person).
*   Action: Add an ventParticipants repeating component zone to the vent schema to replace or run alongside the standalone attributes.

## Phase 2: Event Slug Pages Creation (Next.js)
*Priority: High*

Because the events were previously rendered only as external links or minimal entries within ventsClient.js, we need to implement dynamic page rendering for web/src/app/news&events/events/[slug].

**1. Data Fetching helper (lib/strapi.js):**
*   Create a getEventBySlug(slug, locale) helper similar to getNewsArticleBySlug and getProjectBySlug.
*   Establish GraphQL/REST populate structures for newly added metadata (Participants, related Persons, components).

**2. The Slug Page Component (web/src/app/news&events/events/[slug]/page.js):**
*   Implement layout separating the **main content** and the **Event Info Sidebar**.
*   **Main Content Area:**
    *   Featured Image (hero image) and photoCredits.
    *   Event Title, Abstract / Event description (rendered via standard markdown/rich-text blocks).
    *   Additional Notes block.
    *   Privacy / Recording Notice appended at the bottom.
*   **Event Info Sidebar:**
    *   Display structured data accurately based on Strapi fields (Date/Time, Format, Location/Address, Room, Audience, Language, Contacts).
*   **Share / Actions:**
    *   Add LinkedIn share button using existing generic UI or 
ext-share.

## Phase 3: Add to Calendar Functionality (ICS Generation)
*Priority: High*

**1. ICS Endpoint (web/src/app/api/events/[slug]/ics/route.js)**
*   Create a Next.js App Router API endpoint.
*   Fetch event data via getEventBySlug.
*   Programmatically construct a standard VCARD/ICS format text string including DTSTART, DTEND, SUMMARY, LOCATION, and DESCRIPTION.
*   Return a response with headers: Content-Type: text/calendar; charset=utf-8 and Content-Disposition: attachment; filename="event-[slug].ics".

**2. Download Integration (Client component)**
*   Build an AddToCalendar action button component in the Event sidebar that points to /api/events/\/ics, triggering the direct download for the visitor.

## Phase 4: Remaining UI, Social Media, & Cleanup
*Priority: Low (Tackled Later)*

*   **Google/Outlook/Apple Calendar direct links:** Append direct URL generation alongside the .ics button.
*   **Listing View Updates:** Wire /news&events/events cards to link into the new dynamically generated slug pages instead of an external URL (ctaUrl).
*   Refining the dynamic layout specifically for multi-person panels to conditionally show Speaker Bios pulled from their Person relationships.
