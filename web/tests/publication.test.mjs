import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergePublicationAuthors, publicationExternalUrl } from '../src/lib/publication.js';

test('ordered credits retain external affiliations and internal portraits without duplicating legacy authors', () => {
  const internal = { documentId: 'a', slug: 'internal', name: 'Internal Author', image: '/portrait.png', isExternal: false };
  const legacy = { documentId: 'b', name: 'Existing Author', isExternal: false };
  const authors = mergePublicationAuthors([internal, legacy], [
    { name: 'External Author', affiliation: 'Other University' },
    { person: internal, affiliation: 'AIRi and Partner University' },
  ]);
  assert.deepEqual(authors.map((author) => author.name), ['External Author', 'Internal Author', 'Existing Author']);
  assert.equal(authors[0].affiliation.name, 'Other University');
  assert.equal(authors[0].isExternal, true);
  assert.equal(authors[1].image, '/portrait.png');
  assert.equal(authors[1].affiliation.name, 'AIRi and Partner University');
  assert.equal(authors[1].slug, 'internal');
});

test('legacy publications keep their authors and empty draft credits are ignored', () => {
  const authors = [{ id: 1, name: 'Existing Author' }];
  assert.deepEqual(mergePublicationAuthors(authors), authors);
  assert.deepEqual(mergePublicationAuthors(authors, [{ name: ' ', affiliation: 'University' }]), authors);
});

test('unlinked authors with identical names remain distinct', () => {
  const authors = mergePublicationAuthors([], [
    { name: 'Alex Smith', affiliation: 'University A' },
    { name: 'Alex Smith', affiliation: 'University B' },
  ]);
  assert.equal(authors.length, 2);
});

test('publication links accept web URLs and reject executable or malformed URLs', () => {
  assert.equal(publicationExternalUrl(' https://github.com/example/repo '), 'https://github.com/example/repo');
  assert.equal(publicationExternalUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://youtu.be/dQw4w9WgXcQ');
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'not a URL', '', null]) {
    assert.equal(publicationExternalUrl(url), '');
  }
});
