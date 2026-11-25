import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Game,CARDS,RECIPES,planCraft} from '../game.js';

function interfaceFixture(){
 const elements=new Map();
 function element(selector){
  if(!elements.has(selector))elements.set(selector,{
   innerHTML:'',textContent:'',value:selector==='#exchange-target'?'scrap':'',disabled:false,style:{},open:false,
   className:'',offsetWidth:0,classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},
   showModal(){this.open=true;},close(){this.open=false;}
  });return elements.get(selector);
 }
 let game;
 class FixtureGame extends Game{
  constructor(){super({random:()=>.9});this.players[0].hand=['mulberry','iron','scrap','bamboo','scrap','mulberry','iron'].map(k=>this.card(k));this.phase='player';game=this;}
 }
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
 vm.runInNewContext(source,{Game:FixtureGame,CARDS,RECIPES,planCraft,document:{querySelector:element},setTimeout:()=>1,clearTimeout(){}});
 return {game,element,selectCard(id){element('#hand').onclick({target:{closest(){return{disabled:false,dataset:{card:String(id)}};}}});}};
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
 assert.match(element('#recipes').innerHTML,/data-craft="crossbow"[^>]*>开炉制造/);
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
 assert.match(html,/for="exchange-target"/);assert.match(html,/style\.css\?v=20261125-2/);assert.match(html,/app\.js\?v=20261125-2/);
});
