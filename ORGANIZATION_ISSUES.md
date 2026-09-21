# Organization and People-Mapping Issues 

This document outlines structural and frontend issues regarding the rendering and distribution of people, teams, departments, and projects. Based on recent shifts to introduce team entities, several areas across the website require refactoring.

## 1. Missing Teams Landing Page
**Issue:** `we don't have a place where teams are explicitly listed`
*   **Context:** While departments and projects have list views (e.g. `/research/departments`), there is currently no top-level `/teams` or `/research/teams` page where users can view the full directory of teams at the institute.
*   **Resolution:** A backend list query for teams needs to be connected to a new Next.js page that lists all active teams, potentially grouping them by department.

## 2. Duplicate Occurrences of Project Members
**Issue:** `on projects, people can be both in a team and as individual contributors`
*   **Context:** In `ProjectDetails.js`, `teams.members` and `contributors` are mapped in separate DOM sections. If a person is added indirectly under a project's `teams` relation, and the content authors also manually select them in the project's `contributors` list, they will appear twice.
*   **Resolution:** Implement deduplication logic on the frontend (e.g., aggregating individuals via their `slug` or `id`) before rendering, or enforce a backend validation plugin to prevent overlap.

## 3. Inaccurate People and Project Counters
**Issue:** `the people counters across the website are broken since the introductions of teams`
*   **Context (Departments):** In `DepartmentsClient.js`, the code counts `memberCount` only based on direct connections between staff and a department schema (`s?.departmentInfo?.slug`). It totally misses people exclusively linked via the `teams` relations under a department. Similarly, `projectCount` misses projects assigned implicitly by teams.
*   **Context (Project Details):** In `ProjectDetails.js`, the user/team counter logic uses `const peopleCount = teams.length + contributors.length;`, improperly counting the number of *teams* instead of the number of *people* inside those teams.
*   **Resolution:** Consolidate counting functions across generic pages to deeply check team memberships and team-assigned projects when aggregating metrics.

## 4. Missing Profile Images for Department Coordinators
**Issue:** `people profile images are not fetched for the coordinators of the department slugs`
*   **Context:** In `lib/strapi.js`, the `getDepartments()` fetch configuration invokes `PERSON_FLAT_POPULATE` for `coordinator` and `coCoordinator`. However, `PERSON_FLAT_POPULATE` is purely a primitive array structure `['firstName', 'lastName', ...]` and deliberately excludes the nested `portrait` media relation. 
*   **Resolution:** Create a `PERSON_WITH_IMAGE_POPULATE` definition inside `strapi.js` and apply it to `.coordinator` inside the department payload resolver.

## 5. Missing Images on Team Cards within Department Pages
**Issue:** `for some teams, on department slugs, the images are not rendered`
*   **Context:** Team schemas include an `image` media field (according to `team/schema.json`). On `web/src/app/research/departments/[slug]/page.js`, when team data is mapped, `image` is completely left out of the mapped frontend object, and subsequently not passed to `<TeamCard>`. (Additionally, `getDepartmentTeams` fails to fetch person portraits because it also uses `PERSON_FLAT_POPULATE`). 
*   **Resolution:** Append `portrait` querying inside `getDepartmentTeams`, add team `image` fetching to the GraphQL/REST structure parameters, and map them back to the components.

## 6. Ambiguous and Missing Names on Roles
**Issue:** `for department slugs, on the teams, the role is displayed without the names, making everything ambiguous`
*   **Context:** Inside `web/src/app/research/departments/[slug]/page.js`, team members are mapped explicitly using `name: p.name || ''`. The database schema for `person` utilizes `firstName` and `lastName`, not `name`. As a result, the prop evaluates to a blank string, leaving the `<PersonChip>` to render just an avatar and a role, without knowing who the role belongs to.
*   **Resolution:** Modify the mapping logic to `name: \`${p.firstName || ''} ${p.lastName || ''}\`.trim() || p.name || ''`, identically to how it was properly solved in `transformProjectData`.
