import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS,RECIPES,DECK_COUNTS,EXCHANGE_TARGETS,planCraft} from '../game.js';

function fixture(keys,p=0){
 const game=new Game({random:()=>.9});
 game.players[p].hand=keys.map(key=>game.card(key));game.actor=p;game.phase=p===0?'player':'ai';
 return game;
}
function seeded(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}

test('opening deck and confirmed turn rules stay intact',()=>{
 const g=new Game();assert.equal(Object.values(DECK_COUNTS).reduce((a,b)=>a+b),46);
 assert.equal(g.players[0].hand.length,7);assert.equal(g.players[1].hand.length,5);assert.equal(g.deck.length,34);
});
test('screenshot hand can trade a scrap for the missing drill process and attack',()=>{
 const g=fixture(['mulberry','iron','scrap','bamboo','scrap','mulberry','iron']);
 assert.equal(RECIPES.some(r=>planCraft(g.players[0].hand,r).ok),false);
 const id=g.players[0].hand.find(c=>c.key==='scrap').id;
 assert.ok(g.reforge(0,id,'drill'));assert.equal(g.players[0].hand.length,7);
 assert.ok(g.players[0].hand.find(c=>c.key==='drill').virtual);
 assert.ok(g.craft(0,'crossbow').ok);assert.equal(g.players[1].hp,17);
});
test('all four exchange targets share one per-turn allowance',()=>{
 for(const target of EXCHANGE_TARGETS){
  const g=fixture(['iron','bamboo']);assert.ok(g.reforge(0,g.players[0].hand[0].id,target));
  assert.equal(g.players[0].hand.length,2);assert.equal(g.players[0].reforged,true);
  assert.equal(g.reforge(0,g.players[0].hand[0].id,'powder'),false);
 }
});
test('same-name and invalid exchanges have no side effects',()=>{
 const g=fixture(['scrap','drill']);const hand=JSON.stringify(g.players[0].hand);
 assert.equal(g.reforge(0,g.players[0].hand[0].id,'scrap'),false);
 assert.equal(g.reforge(0,g.players[0].hand[1].id,'drill'),false);
 assert.equal(g.reforge(0,g.players[0].hand[0].id,'iron'),false);
 assert.equal(g.reforge(0,999999,'glue'),false);
 assert.equal(g.players[0].reforged,false);assert.equal(JSON.stringify(g.players[0].hand),hand);
});
test('temporary exchanged processes disappear when used or traded again',()=>{
 const g=fixture(['bamboo','tendon','iron']);const source=g.players[0].hand[2];
 g.reforge(0,source.id,'glue');g.craft(0,'bow');
 assert.equal(g.discard.length,3);assert.equal(g.discard.some(c=>c.key==='glue'),false);
 const next=fixture(['drill']);next.players[0].hand[0].virtual=true;
 next.reforge(0,next.players[0].hand[0].id,'powder');assert.equal(next.discard.length,0);
});
test('exchange cannot bypass turn, overflow, or unresolved explosion',()=>{
 const g=fixture(['bamboo']);const id=g.players[0].hand[0].id;
 for(const phase of ['ai','overflow','risk','over']){g.phase=phase;assert.equal(g.reforge(0,id,'glue'),false);}
 assert.equal(g.reforge(1,id,'glue'),false);
});
test('scrap cannot replace a process or two materials',()=>{
 const g=fixture(['bamboo','tendon','scrap']);assert.equal(planCraft(g.players[0].hand,RECIPES[0]).ok,false);
 g.players[0].hand=['scrap','scrap','glue'].map(k=>g.card(k));assert.equal(planCraft(g.players[0].hand,RECIPES[0]).ok,false);
});
test('new exchange consumes no manufacturing allowance; crafting still limited to once',()=>{
 const g=fixture(['bamboo','tendon','iron','bamboo','tendon','glue']);
 g.reforge(0,g.players[0].hand[2].id,'glue');assert.equal(g.players[0].crafted,false);
 assert.ok(g.craft(0,'bow').ok);assert.equal(g.craft(0,'bow').ok,false);assert.equal(g.players[1].hp,18);
});
test('AI keeps a complete recipe in the reported nine-card regression',()=>{
 const g=fixture(['scrap','tendon','scrap','iron','powder','powder','glue','ash','mulberry'],1);
 g.phase='ai-overflow';assert.equal(g.aiStep(),'trim');assert.equal(g.players[1].hand.length,7);
 assert.ok(RECIPES.some(r=>planCraft(g.players[1].hand,r).ok));
 assert.equal(g.aiStep(),'craft');assert.ok(g.players[0].hp<20);
});
test('AI actively exchanges for a missing process using the same player rule',()=>{
 const g=fixture(['mulberry','iron','scrap','bamboo','scrap','mulberry','iron'],1);
 assert.equal(g.aiStep(),'reforge');assert.equal(g.players[1].reforged,true);
 assert.equal(g.players[1].hand.length,7);assert.ok(g.players[1].hand.some(c=>c.key==='drill'));
 assert.equal(g.aiStep(),'craft');assert.equal(g.players[0].hp,17);
 assert.equal(g.aiStep(),'end');assert.equal(g.actor,0);
});
test('AI does not waste exchanges when none can enable a recipe',()=>{
 const g=fixture(['scrap','scrap','scrap'],1);assert.equal(g.aiStep(),'end');
 assert.equal(g.players[1].reforged,false);assert.equal(g.players[1].hand.length,3);
});
test('explosion consumes the opportunity and supports both loss choices',()=>{
 for(const choice of ['damage','discard']){
  const g=fixture(['iron','nitrate','sulphur','bamboo','tendon','scrap']);
  g.reforge(0,g.players[0].hand.find(c=>c.key==='scrap').id,'powder');g.random=()=>0;
  assert.ok(g.craft(0,'musket').exploded);assert.equal(g.phase,'risk');assert.equal(g.players[0].crafted,true);
  assert.equal(g.endTurn(0),false);assert.ok(g.resolveRisk(choice,g.players[0].hand.map(c=>c.id)));
  assert.equal(g.players[0].hp,choice==='damage'?19:20);assert.equal(g.players[1].hp,20);
 }
});
test('only exact overflow card choices proceed; lethal attacks end immediately',()=>{
 const g=fixture(Array(9).fill('bamboo'));g.phase='overflow';
 assert.equal(g.trim(0,[999,998]),false);assert.equal(g.trim(0,[g.players[0].hand[0].id]),false);
 assert.ok(g.trim(0,g.players[0].hand.slice(0,2).map(c=>c.id)));assert.equal(g.players[0].hand.length,7);
 const lethal=fixture(['bamboo','tendon','glue']);lethal.players[1].hp=2;lethal.craft(0,'bow');assert.equal(lethal.phase,'over');assert.equal(lethal.winner,0);
});
test('500 seeded overflow hands never lose their last craftable recipe',()=>{
 const g=new Game({random:seeded(42)}),keys=Object.entries(DECK_COUNTS).flatMap(([k,n])=>Array(n).fill(k));let cases=0;
 for(let i=0;i<500;i++){
  const hand=g.shuffle([...keys]).slice(0,9).map(k=>g.card(k));g.players[1].hand=hand;g.players[1].reforged=false;
  if(!RECIPES.some(r=>planCraft(hand,r).ok))continue;
  const discard=g.chooseDiscards(1,2), kept=hand.filter(c=>!discard.includes(c.id));
  assert.equal(discard.length,2);assert.ok(RECIPES.some(r=>planCraft(kept,r).ok));cases++;
 }
 assert.ok(cases>300);
});
test('100 full matches finish; AI attacks and every manufactured hand obeys limits',()=>{
 let turns=0,hits=0;
 for(let seed=1;seed<=100;seed++){
  const g=new Game({random:seeded(seed)});let steps=0,lastAiTurn=0;
  while(g.phase!=='over'&&steps++<1500){
   if(g.actor===1){
    if(g.turn!==lastAiTurn){turns++;lastAiTurn=g.turn;}
    const action=g.aiStep();if(action==='craft'&&g.event?.type==='attack')hits++;
    continue;
   }
   if(g.phase==='overflow'){assert.ok(g.trim(0,g.chooseDiscards(0,g.players[0].hand.length-7)));continue;}
   if(g.phase==='risk'){assert.ok(g.resolveRisk('damage'));continue;}
   assert.equal(g.phase,'player');const p=g.players[0];assert.ok(p.hand.length<=7);
   if(p.crafted){g.endTurn(0);continue;}
   const r=g.chooseRecipe(0);if(r){g.craft(0,r.id);continue;}
   const exchange=!p.reforged?g.bestExchange(0):null;
   if(exchange){assert.ok(g.reforge(0,exchange.id,exchange.target));continue;}
   g.endTurn(0);
  }
  assert.equal(g.phase,'over',`unfinished match ${seed}`);assert.ok(g.round<40);assert.ok(steps<1500);
 }
 assert.ok(hits/turns>.35,`AI attack rate unexpectedly low: ${hits}/${turns}`);
});
