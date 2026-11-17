import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeExternalUrl, parseMatterportUrl } from '../src/lib/matterport.js';

test('a Matterport share URL becomes a clean embed, thumbnail, and external link', () => {
  const tour = parseMatterportUrl(' https://my.matterport.com/show/?m=aCMSqhHHnKV ');

  assert.equal(tour.modelId, 'aCMSqhHHnKV');
  assert.equal(tour.url, 'https://my.matterport.com/show/?m=aCMSqhHHnKV');
  assert.equal(
    tour.embedUrl,
    'https://my.matterport.com/show/?m=aCMSqhHHnKV&play=1&qs=1&title=0',
  );
  assert.equal(
    tour.thumbnailUrl,
    'https://my.matterport.com/api/v2/player/models/aCMSqhHHnKV/thumb?width=1600',
  );
  assert.equal(
    tour.thumbnailSrcSet,
    'https://my.matterport.com/api/v2/player/models/aCMSqhHHnKV/thumb?width=800 800w, ' +
      'https://my.matterport.com/api/v2/player/models/aCMSqhHHnKV/thumb?width=1200 1200w, ' +
      'https://my.matterport.com/api/v2/player/models/aCMSqhHHnKV/thumb?width=1600 1600w',
  );
});

test('extra Matterport parameters and VR links are accepted', () => {
  assert.equal(
    parseMatterportUrl('https://my.matterport.com/show/?m=aCMSqhHHnKV&play=1&qs=1')?.modelId,
    'aCMSqhHHnKV',
  );
  assert.equal(
    parseMatterportUrl('https://my.matterport.com/vr/show/?m=aCMSqhHHnKV')?.modelId,
    'aCMSqhHHnKV',
  );
  assert.equal(
    parseMatterportUrl('https://matterport.com/show?m=aCMSqhHHnKV')?.modelId,
    'aCMSqhHHnKV',
  );
});

test('non-Matterport and malformed values are rejected', () => {
  for (const url of [
    'https://example.com/show/?m=aCMSqhHHnKV',
    'https://my.matterport.com.evil.example/show/?m=aCMSqhHHnKV',
    'https://my.matterport.com/show/?m=',
    'https://my.matterport.com/show/?m=bad<script>',
    'javascript:alert(1)',
    'data:text/html,test',
    'not a URL',
    '',
    null,
    undefined,
  ]) {
    assert.equal(parseMatterportUrl(url), null);
  }
});

test('external URLs are limited to http and https', () => {
  assert.equal(
    normalizeExternalUrl(' https://example.com/tour '),
    'https://example.com/tour',
  );
  assert.equal(normalizeExternalUrl('http://example.com/tour'), 'http://example.com/tour');

  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'mailto:tour@example.com', '', null]) {
    assert.equal(normalizeExternalUrl(url), '');
  }
});
