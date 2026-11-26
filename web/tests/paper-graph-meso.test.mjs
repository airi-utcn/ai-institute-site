import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildMesoTopics,
  filterPublicationsForMesoTopic,
  getPublicationMesoMembership,
} from '../src/app/research/paper-graph/meso.js';

const meso = (slug, name = slug) => ({ slug, name });
const paper = (id, primary, tags = [], year = 2024) => ({
  id,
  title: `Paper ${id}`,
  year,
  graphMesoPrimary: primary ? meso(primary) : null,
  graphMesoTags: tags.map((tag) => meso(tag)),
});

test('primary relation counts as a tag when the tag relation is missing', () => {
  const membership = getPublicationMesoMembership(paper('p1', 'a', []));
  assert.deepEqual(membership.allKeys, ['a']);
});

test('tracks primary and tagged counts separately', () => {
  const publications = [
    paper('p1', 'a', ['a', 'b']),
    paper('p2', 'a', ['a']),
    paper('p3', 'b', ['b', 'a']),
  ];
  const topics = buildMesoTopics(publications);
  const a = topics.find((topic) => topic.key === 'a');
  const b = topics.find((topic) => topic.key === 'b');

  assert.equal(a.paperCount, 2);
  assert.equal(a.taggedCount, 3);
  assert.equal(b.paperCount, 1);
  assert.equal(b.taggedCount, 2);

  assert.equal(filterPublicationsForMesoTopic(publications, a, { scope: 'primary' }).length, 2);
  assert.equal(filterPublicationsForMesoTopic(publications, a, { scope: 'tagged' }).length, 3);
});

test('merged other-themes node unions tagged papers without double counting', () => {
  const publications = [
    paper('p1', 'small-a', ['small-a', 'small-b']),
    paper('p2', 'small-b', ['small-b', 'small-a']),
  ];
  const topics = buildMesoTopics(publications, { maxNodes: 1 });
  assert.equal(topics.length, 1);
  assert.equal(topics[0].key, 'other-themes');
  assert.equal(topics[0].paperCount, 2);
  assert.equal(topics[0].taggedCount, 2);
});

test('primary counts partition the macro total', () => {
  const publications = [
    paper('p1', 'a', ['a', 'b']),
    paper('p2', 'a', ['a']),
    paper('p3', 'b', ['b']),
    paper('p4', 'c', ['c']),
  ];
  const topics = buildMesoTopics(publications);
  const primaryTotal = topics.reduce((sum, topic) => sum + topic.paperCount, 0);
  assert.equal(primaryTotal, publications.length);
});
