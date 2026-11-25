import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../game.js';
import {CARD_ATLAS,CARD_ART_KEYS,cardIllustration} from '../card-art.js';

test('local illustrated atlas covers every card with a distinct crop inside the image',()=>{
 const png=readFileSync(new URL(`../${CARD_ATLAS.url.split('?')[0]}`,import.meta.url));
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),CARD_ATLAS.width);
 assert.equal(png.readUInt32BE(20),CARD_ATLAS.height);
 assert.deepEqual([...CARD_ART_KEYS].sort(),Object.keys(CARDS).sort());
 const viewports=new Set();
 for(const key of Object.keys(CARDS)){
  const markup=cardIllustration(key),match=markup.match(/viewBox="([\d. ]+)"/);
  assert.ok(match,`missing illustration for ${key}`);
  const [x,y,w,h]=match[1].split(' ').map(Number);
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=CARD_ATLAS.width&&y+h<=CARD_ATLAS.height);
  assert.ok(markup.includes(CARD_ATLAS.url));
  viewports.add(match[1]);
 }
 assert.equal(viewports.size,CARD_ART_KEYS.length);
 assert.equal(cardIllustration('unknown'),'');
});
