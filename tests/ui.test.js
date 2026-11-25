import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Game,CARDS,RECIPES,planCraft} from '../game.js';
import {createBattleEffect} from '../effects.js';

function interfaceFixture(keys=['mulberry','iron','scrap','bamboo','scrap','mulberry','iron'],phase='player'){
 const elements=new Map(),timers=new Map();let nextTimer=1;
 function element(selector){
  if(!elements.has(selector)){
   const classes=new Set();elements.set(selector,{
   innerHTML:'',textContent:'',value:selector==='#exchange-target'?'scrap':'',disabled:false,attributes:{},open:false,
   className:'',offsetWidth:0,classList:{add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},contains(name){return classes.has(name);}},setAttribute(name,value){this.attributes[name]=String(value);},addEventListener(){},
   style:{setProperty(name,value){this[name]=value;}},
   showModal(){this.open=true;},close(){this.open=false;}
   });
  }return elements.get(selector);
 }
 let game;
 class FixtureGame extends Game{
  constructor(){super({random:()=>.9});this.players[0].hand=keys.map(k=>this.card(k));this.phase=phase;game=this;}
 }
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'');
 vm.runInNewContext(source,{Game:FixtureGame,CARDS,RECIPES,planCraft,createBattleEffect,document:{querySelector:element},setTimeout(callback,delay){const id=nextTimer++;timers.set(id,{callback,delay});return id;},clearTimeout(id){timers.delete(id);}});
 return {game,element,timers,
  runTimer(delay){const entry=[...timers].find(([,timer])=>timer.delay===delay);assert.ok(entry,`missing timer ${delay}`);timers.delete(entry[0]);entry[1].callback();},
  selectCard(id){element('#hand').onclick({target:{closest(){return{disabled:false,dataset:{card:String(id)}};}}});},
  craft(id){element('#recipes').onclick({target:{closest(){return{disabled:false,dataset:{craft:id}};}}});}
 };
}

test('actual UI names the missing process and enables selected scrap-to-process exchange',()=>{
 const ui=interfaceFixture(),{game,element}=ui;
 assert.match(element('#recipes').innerHTML,/缺：冶铁钻孔/);
 element('#exchange-target').value='drill';element('#exchange-target').onchange();
 assert.equal(element('#reforge').disabled,true);
 ui.selectCard(game.players[0].hand.find(c=>c.key==='scrap').id);
 assert.equal(element('#reforge').disabled,false);
 element('#reforge').onclick();
 assert.equal(game.players[0].reforged,true);assert.equal(game.players[0].hand.length,7);
 assert.equal(element('#reforge').disabled,true);assert.equal(element('#exchange-target').disabled,true);
 assert.match(element('#recipes').innerHTML,/data-craft="crossbow"[^>]*><span class="make-label-full">开炉制造/);
 assert.match(element('#toast').textContent,/冶铁钻孔/);
 element('#recipes').onclick({target:{closest(){return{disabled:false,dataset:{craft:'crossbow'}};}}});
 assert.equal(game.players[1].hp,17);assert.equal(element('#enemy-hp').textContent,17);
 assert.match(element('#logs').innerHTML,/造成3点伤害/);
});
test('selecting the same exchange target stays disabled and rules explain the shared allowance',()=>{
 const {game,element,selectCard}=interfaceFixture();
 selectCard(game.players[0].hand.find(c=>c.key==='scrap').id);assert.equal(element('#reforge').disabled,true);
 element('#rules').onclick();assert.ok(element('#modal').open);
 assert.match(element('#modal-content').innerHTML,/四种换取目标共用每回合一次机会/);
 assert.match(element('#modal-content').innerHTML,/边角料也可以换成工序/);
});
test('HTML includes all exchange targets and versioned assets',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const key of ['scrap','glue','drill','powder'])assert.ok(html.includes(`value="${key}"`));
 assert.match(html,/for="exchange-target"/);assert.match(html,/style\.css\?v=20261125-4/);assert.match(html,/app\.js\?v=20261125-4/);
 assert.match(html,/polish\.css\?v=20261125-4/);assert.match(html,/mobile\.css\?v=20261125-4/);
 assert.equal((html.match(/id="battle-fx"/g)||[]).length,1);
});

test('hand groups preserve all card identities and clearly mark missing processes',()=>{
 const {game,element,selectCard}=interfaceFixture();const html=element('#hand').innerHTML;
 for(const type of ['material','process','wild'])assert.ok(html.includes(`data-hand-group="${type}"`));
 assert.match(html,/材料牌/);assert.match(html,/工序牌/);assert.match(html,/通用牌/);assert.match(html,/可重铸换取工序/);
 const ids=[...html.matchAll(/data-card="(\d+)"/g)].map(m=>Number(m[1]));
 assert.equal(ids.length,game.players[0].hand.length);assert.equal(new Set(ids).size,ids.length);
 for(const card of game.players[0].hand)assert.ok(ids.includes(card.id));
 selectCard(game.players[0].hand[0].id);assert.match(element('#hand').innerHTML,/card-selected/);
});
test('outgoing attack plays once, blocks turn changes until impact completes, then releases controls',()=>{
 const ui=interfaceFixture(['bamboo','tendon','glue']);const {game,element}=ui;
 ui.craft('bow');assert.equal(game.players[1].hp,18);assert.match(element('#battle-fx').className,/fx-bow from-player/);
 assert.equal(element('#end-turn').disabled,true);const turn=game.turn;
 element('#end-turn').onclick();assert.equal(game.turn,turn);
 const markup=element('#battle-fx').innerHTML;assert.match(markup,/对方声望 −2/);
 ui.selectCard(9999);assert.equal(element('#battle-fx').innerHTML,markup);
 ui.runTimer(510);assert.ok(element('.enemy-workshop').classList.contains('is-hit'));
 ui.runTimer(1350);assert.equal(element('#battle-fx').innerHTML,'');assert.equal(element('#end-turn').disabled,false);
 assert.equal(element('.enemy-workshop').classList.contains('is-hit'),false);
});
test('incoming AI damage targets the player and waits for the effect before ending its turn',()=>{
 const ui=interfaceFixture(['bamboo']);const {game,element}=ui;
 element('#end-turn').onclick();assert.equal(game.actor,1);
 game.players[1].hand=['bamboo','tendon','glue'].map(k=>game.card(k));
 ui.runTimer(850);assert.equal(game.players[0].hp,18);
 assert.match(element('#battle-fx').className,/from-enemy/);assert.match(element('#battle-announcement').textContent,/你的声望 −2/);
 ui.runTimer(510);assert.ok(element('.player-workshop').classList.contains('is-hit'));
 ui.runTimer(1350);assert.equal(game.actor,1);
 ui.runTimer(1430);assert.equal(game.actor,0);
});
test('explosion finishes before the loss-choice dialog opens',()=>{
 const ui=interfaceFixture(['iron','nitrate','sulphur','powder','bamboo','tendon']);const {game,element}=ui;
 game.random=()=>0;ui.craft('musket');assert.equal(game.phase,'risk');
 assert.match(element('#battle-fx').className,/fx-explosion/);assert.equal(element('#modal').open,false);
 assert.equal(game.players[0].hp,20);ui.runTimer(1650);assert.equal(element('#modal').open,true);
 assert.match(element('#modal-content').innerHTML,/弃 2 张手牌/);
 element('#take-hit').onclick();assert.equal(game.players[0].hp,19);assert.equal(element('#modal').open,false);
});
test('victory waits for the final impact; restart cancels old visual callbacks',()=>{
 const ui=interfaceFixture(['bamboo','tendon','glue']);const {game,element}=ui;
 game.players[1].hp=2;ui.craft('bow');assert.equal(game.phase,'over');assert.equal(element('#modal').open,false);
 ui.runTimer(1350);assert.equal(element('#modal').open,true);assert.match(element('#modal-content').innerHTML,/百炼成兵/);
 const next=interfaceFixture(['bamboo','tendon','glue']);next.craft('bow');next.element('#restart').onclick();next.element('#confirm-restart').onclick();
 assert.equal(next.element('#battle-fx').innerHTML,'');assert.equal(next.game.phase,'player');
 assert.equal([...next.timers.values()].some(t=>t.delay===510||t.delay===1350),false);
});

test('all five weapon tabs stay available and inspecting a recipe changes no combat state',()=>{
 const {game,element}=interfaceFixture();
 assert.equal((element('#recipe-tabs').innerHTML.match(/data-inspect=/g)||[]).length,5);
 const hand=JSON.stringify(game.players[0].hand);
 element('#recipe-tabs').onclick({target:{closest(){return{dataset:{inspect:'crossbow'}};}}});
 assert.match(element('#recipes').innerHTML,/<article class="recipe[^\"]*is-inspected" aria-label="神臂弩配方"/);
 assert.equal(JSON.stringify(game.players[0].hand),hand);assert.equal(game.players[0].crafted,false);
 element('#recipe-detail-view').onclick();assert.ok(element('#modal').open);
 assert.match(element('#modal-content').innerHTML,/神臂弩配方/);assert.match(element('#modal-content').innerHTML,/冶铁钻孔 · 缺少/);
 element('#close-recipe-detail').onclick();assert.equal(element('#modal').open,false);
});
test('reforging switches the compact forge to a newly craftable weapon',()=>{
 const ui=interfaceFixture(),{game,element}=ui;
 ui.selectCard(game.players[0].hand.find(c=>c.key==='scrap').id);
 element('#exchange-target').value='drill';element('#exchange-target').onchange();element('#reforge').onclick();
 assert.match(element('#recipes').innerHTML,/<article class="recipe ready is-inspected" aria-label="神臂弩配方"/);
 assert.match(element('#recipe-tabs').innerHTML,/data-inspect="crossbow" aria-pressed="true"/);
});
test('a nine-card overflow hand remains complete and selectable before shrinking back to seven',()=>{
 const ui=interfaceFixture(['bamboo','tendon','glue','mulberry','iron','drill','scrap','ash','powder'],'overflow');
 const {game,element}=ui;assert.equal(element('#hand').attributes['data-hand-size'],'9');
 assert.equal((element('#hand').innerHTML.match(/data-card=/g)||[]).length,9);
 assert.equal(element('#end-turn').disabled,true);assert.match(element('#selection-hint').textContent,/弃2张/);
 const ids=game.players[0].hand.slice(0,2).map(c=>c.id);ids.forEach(ui.selectCard);
 assert.equal(element('#end-turn').disabled,false);element('#end-turn').onclick();
 assert.equal(game.players[0].hand.length,7);assert.equal(element('#hand').attributes['data-hand-size'],'7');assert.equal(game.phase,'player');
});
test('journal and selected-card explanations open and close without consuming actions',()=>{
 const ui=interfaceFixture(),{game,element}=ui;
 element('#logs-toggle').onclick();assert.ok(element('#modal').open);assert.match(element('#modal-content').innerHTML,/对局记录/);
 element('#close-journal').onclick();assert.equal(element('#modal').open,false);
 const card=game.players[0].hand[0];ui.selectCard(card.id);element('#context-help').onclick();
 assert.match(element('#modal-content').innerHTML,new RegExp(CARDS[card.key].name));
 element('#close-context').onclick();assert.equal(element('#modal').open,false);assert.equal(game.players[0].reforged,false);assert.equal(game.turn,1);
});
