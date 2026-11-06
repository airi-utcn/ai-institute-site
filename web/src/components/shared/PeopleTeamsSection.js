'use client';

import { FaUserTie, FaUsers } from 'react-icons/fa';
import PersonChip from './PersonChip';
import TeamCard from '@/components/TeamCard';
import { getPeopleOutsideTeams } from '@/lib/people';

export default function PeopleTeamsSection({
  people = [],
  teams = [],
  staffLookup = {},
  peopleLabel = 'People',
  teamsLabel = 'Teams',
  emptyState = 'No people found.',
  t = (key) => key,
}) {
  const independentPeople = getPeopleOutsideTeams(people, teams);
  const hasTeams = teams.length > 0;
  const hasPeople = independentPeople.length > 0;

  if (!hasTeams && !hasPeople) {
    return (
      <div className="empty-state">
        <p>{emptyState}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasTeams && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <FaUsers className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {teamsLabel}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {teams.length}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {teams.map((team, index) => (
              <TeamCard
                key={team.slug || team.id || index}
                team={team}
                staffLookup={staffLookup}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {hasPeople && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <FaUserTie className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {peopleLabel}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {independentPeople.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {independentPeople.map((person, index) => (
              <div
                key={person.slug || index}
                className="card p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <PersonChip
                  person={person}
                  image={person.image}
                  imageSrcSet={person.imageSrcSet}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
