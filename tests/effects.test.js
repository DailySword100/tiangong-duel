import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleEffect} from '../effects.js';

test('every weapon has an appropriate outgoing and incoming visual description',()=>{
 for(const recipeId of ['bow','crossbow','musket','cannon','mine'])for(const p of [0,1]){
  const effect=createBattleEffect({type:'attack',p,recipeId,damage:3});
  assert.equal(effect.target,1-p);assert.equal(effect.attacker,p);assert.equal(effect.variant,recipeId);
  assert.ok(effect.duration>effect.impactDelay);assert.ok(effect.impactDelay>0);
  assert.match(effect.html,p===0?/对方声望 −3/:/你的声望 −3/);
  assert.ok(effect.className.includes(p===0?'from-player':'from-enemy'));
 }
});
test('crossbow fires a volley; firearm explosions hit their own workshop without inventing HP loss',()=>{
 const crossbow=createBattleEffect({type:'attack',p:0,recipeId:'crossbow',damage:3});
 assert.equal((crossbow.html.match(/class="fx-flight"/g)||[]).length,3);
 for(const p of [0,1]){
  const explosion=createBattleEffect({type:'explosion',p,recipeId:'cannon'});
  assert.equal(explosion.target,p);assert.equal(explosion.heavy,true);assert.equal(explosion.explosion,true);
  assert.match(explosion.announcement,/材料尽毁/);assert.equal(explosion.html.includes('−1'),false);
 }
});
test('presentation does not mutate events and ignores unsupported combat events',()=>{
 const event=Object.freeze({type:'attack',p:0,recipeId:'bow',damage:2});assert.ok(createBattleEffect(event));
 for(const invalid of [null,{}, {type:'other',p:0,recipeId:'bow'},{type:'attack',p:2,recipeId:'bow'},{type:'attack',p:0,recipeId:'unknown'}])assert.equal(createBattleEffect(invalid),null);
});
