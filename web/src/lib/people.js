/**
 * Shared helpers for working with people and teams.
 *
 * These are intentionally small and reusable so that pages such as
 * departments and laboratories can keep the same rules: a person that is
 * already part of any team should not also show up as an independent
 * researcher/individual contributor.
 */

const normalizePersonKey = (person) => {
  const slug = String(person?.slug || '').trim().toLowerCase();
  const name = String(person?.name || '').trim().toLowerCase();

  if (slug && slug !== 'null') return `slug:${slug}`;
  if (name && name !== 'null') return `name:${name}`;
  return null;
};

export function buildTeamMemberKeys(teams = []) {
  const keys = new Set();

  teams.forEach((team) => {
    (team?.members || []).forEach((member) => {
      const key = normalizePersonKey(member?.person);
      if (key) keys.add(key);
    });
  });

  return keys;
}

export function isPersonInTeams(person, teamMemberKeys = []) {
  const key = normalizePersonKey(person);
  return Boolean(key && teamMemberKeys.has(key));
}

export function getPeopleOutsideTeams(people = [], teams = []) {
  const teamMemberKeys = buildTeamMemberKeys(teams);
  return people.filter((person) => !isPersonInTeams(person, teamMemberKeys));
}

export function getPeopleCount(people = [], teams = []) {
  return getPeopleOutsideTeams(people, teams).length + buildTeamMemberKeys(teams).size;
}
