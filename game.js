export const CARDS = {
 bamboo:{name:'竹',type:'material',mark:'竹',note:'弓身之骨'}, tendon:{name:'牛筋',type:'material',mark:'筋',note:'劲弦之材'},
 mulberry:{name:'桑木',type:'material',mark:'木',note:'制弩良木'},iron:{name:'铁',type:'material',mark:'铁',note:'百兵之基'},
 nitrate:{name:'硝石',type:'material',mark:'硝',note:'火药之引'},sulphur:{name:'硫黄',type:'material',mark:'硫',note:'烈火之性'},ash:{name:'草木灰',type:'material',mark:'灰',note:'炉火余烬'},
 glue:{name:'熬胶缠筋',type:'process',mark:'胶',note:'制弓工序'},drill:{name:'冶铁钻孔',type:'process',mark:'锻',note:'制弩工序'},powder:{name:'配比火药',type:'process',mark:'药',note:'火器工序'},
 scrap:{name:'边角料',type:'wild',mark:'料',note:'替代一种材料 · 伤害−1'}
};
export const RECIPES = [
 {id:'bow',name:'弓',kind:'冷兵器',damage:2,risk:0,needs:['bamboo','tendon','glue'],desc:'竹为骨，筋为弦。一箭破空。'},
 {id:'crossbow',name:'神臂弩',kind:'冷兵器',damage:3,risk:0,needs:['mulberry','iron','drill'],desc:'桑木承力，铁机蓄势。'},
 {id:'musket',name:'鸟铳',kind:'火器',damage:4,risk:.3,needs:['iron','nitrate','sulphur','powder'],desc:'火光乍起，铳声惊雷。'},
 {id:'cannon',name:'红夷炮',kind:'重火器',damage:6,risk:.3,needs:['iron','nitrate','sulphur','ash','powder'],desc:'重炮出膛，一击撼动工坊。'},
 {id:'mine',name:'地雷',kind:'火器',damage:4,risk:.3,needs:['iron','nitrate','ash','powder'],desc:'伏火藏雷，制造后立即引爆。'}
];
export const DECK_COUNTS={bamboo:5,tendon:4,mulberry:4,iron:5,nitrate:3,sulphur:3,ash:2,glue:3,drill:3,powder:4,scrap:10};
export const EXCHANGE_TARGETS=['scrap','glue','drill','powder'];
const MAX_HAND=7;
export function planCraft(hand, recipe){
 const used=[], missing=[]; let wildUsed=false;
 for(const key of recipe.needs){
  let index=hand.findIndex((c,i)=>c.key===key&&!used.includes(i));
  if(index<0&&CARDS[key].type==='material'&&!wildUsed){ index=hand.findIndex((c,i)=>c.key==='scrap'&&!used.includes(i)); if(index>=0)wildUsed=true; }
  if(index<0)missing.push(key); else used.push(index);
 }
 return {ok:missing.length===0,used,missing,wildUsed,damage:recipe.damage-(wildUsed?1:0)};
}
export class Game {
 constructor({random=Math.random}={}){this.random=random;this.serial=0;this.reset();}
 card(key,virtual=false){return {key,id:++this.serial,virtual};}
 shuffle(cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
 reset(){
  this.deck=this.shuffle(Object.entries(DECK_COUNTS).flatMap(([key,count])=>Array.from({length:count},()=>this.card(key))));
  this.discard=[];this.players=[{hp:20,hand:[],crafted:false,reforged:false},{hp:20,hand:[],crafted:false,reforged:false}];
  this.turn=0;this.actor=0;this.phase='setup';this.winner=null;this.pending=null;this.logs=[];this.event=null;
  for(let i=0;i<5;i++)for(let p=0;p<2;p++)this.draw(p,1);
  this.log('两座工坊开炉，比试开始。');this.startTurn(0);
 }
 log(message){this.logs.unshift(message);this.logs=this.logs.slice(0,60);}
 dispose(cards){this.discard.push(...cards.filter(c=>!c.virtual));}
 draw(p,count){for(let i=0;i<count;i++){
  if(!this.deck.length&&this.discard.length){this.deck=this.shuffle(this.discard.splice(0));this.log('弃牌回炉，公共牌库重新洗牌。');}
  if(!this.deck.length)break;this.players[p].hand.push(this.deck.pop());
 }}
 startTurn(p){
  if(this.phase==='over')return;
  this.actor=p;this.turn++;this.event=null;this.pending=null;
  const player=this.players[p];player.crafted=false;player.reforged=false;
  this.phase=p===0?'player':'ai';
  if(this.round>=12){player.hp=Math.max(0,player.hp-1);this.log(`${this.name(p)}炉火衰竭，声望 −1。`);if(this.checkWin())return;}
  this.draw(p,2);this.log(`第${this.round}轮 · ${this.name(p)}抽取手牌。`);
  if(player.hand.length>MAX_HAND)this.phase=p===0?'overflow':'ai-overflow';
 }
 get round(){return Math.ceil(this.turn/2);}
 name(p){return p===0?'你的工坊':'隔壁工坊';}
 canAct(p=this.actor){return p===this.actor&&this.phase===(p===0?'player':'ai');}
 trim(p,ids){
  if(p!==this.actor||!['overflow','ai-overflow'].includes(this.phase))return false;
  const player=this.players[p], needed=player.hand.length-MAX_HAND;
  const unique=[...new Set(ids)];if(unique.length!==needed||unique.some(id=>!player.hand.some(c=>c.id===id)))return false;
  this.dispose(player.hand.filter(c=>unique.includes(c.id)));player.hand=player.hand.filter(c=>!unique.includes(c.id));
  this.phase=p===0?'player':'ai';this.log(`${this.name(p)}弃置${needed}张溢出手牌。`);return true;
 }
 reforge(p,id,target='scrap'){
  const player=this.players[p];if(!this.canAct(p)||player.reforged)return false;
  if(!EXCHANGE_TARGETS.includes(target))return false;
  const index=player.hand.findIndex(c=>c.id===id&&c.key!==target);if(index<0)return false;
  const [card]=player.hand.splice(index,1);this.dispose([card]);player.hand.push(this.card(target,true));player.reforged=true;
  this.log(`${this.name(p)}重铸「${CARDS[card.key].name}」，换得「${CARDS[target].name}」。`);return true;
 }
 craft(p,recipeId){
  const player=this.players[p], recipe=RECIPES.find(r=>r.id===recipeId);
  if(!recipe||!this.canAct(p)||player.crafted)return {ok:false};
  const plan=planCraft(player.hand,recipe);if(!plan.ok)return {ok:false};
  const consumed=player.hand.filter((_,i)=>plan.used.includes(i));player.hand=player.hand.filter((_,i)=>!plan.used.includes(i));this.dispose(consumed);player.crafted=true;
  if(recipe.risk&&this.random()<recipe.risk){
   this.pending={p,recipeId};this.phase='risk';this.event={type:'explosion',p,recipeId};
   this.log(`${this.name(p)}制造「${recipe.name}」炸炉！材料已损失。`);return {ok:true,exploded:true};
  }
  const other=this.players[1-p];other.hp=Math.max(0,other.hp-plan.damage);this.event={type:'attack',p,recipeId,damage:plan.damage};
  this.log(`${this.name(p)}制成「${recipe.name}」${plan.wildUsed?'（边角料代材）':''}，造成${plan.damage}点伤害。`);this.checkWin();return {ok:true,exploded:false};
 }
 resolveRisk(choice,ids=[]){
  if(this.phase!=='risk'||!this.pending)return false;const p=this.pending.p, player=this.players[p];
  if(choice==='discard'){
   const unique=[...new Set(ids)];if(unique.length!==2||unique.some(id=>!player.hand.some(c=>c.id===id)))return false;
   this.dispose(player.hand.filter(c=>unique.includes(c.id)));player.hand=player.hand.filter(c=>!unique.includes(c.id));this.log(`${this.name(p)}弃置2张手牌，保住声望。`);
  }else if(choice==='damage'){player.hp=Math.max(0,player.hp-1);this.log(`${this.name(p)}承担炸炉损失，声望 −1。`);}else return false;
  this.pending=null;this.phase=p===0?'player':'ai';this.checkWin();return true;
 }
 endTurn(p){if(!this.canAct(p))return false;this.startTurn(1-p);return true;}
 checkWin(){const dead=this.players.map(p=>p.hp<=0);if(!dead.some(Boolean))return false;this.phase='over';this.winner=dead[0]&&dead[1]?-1:dead[0]?1:0;return true;}
 cardValue(card,hand){
  const key=card.key;if(key==='scrap')return 3.5;
  const duplicates=hand.filter(c=>c.key===key).length;
  let value=CARDS[key].type==='process'?3:2;
  const useful=RECIPES.filter(r=>r.needs.includes(key)).map(r=>r.needs.filter(k=>hand.some(c=>c.key===k)).length/r.needs.length);
  value+=Math.max(0,...useful)*3;return value-(duplicates-1)*1.5;
 }
 weakest(p,count=1,excludeScrap=false){const hand=this.players[p].hand;return [...hand].filter(c=>!excludeScrap||c.key!=='scrap').sort((a,b)=>this.cardValue(a,hand)-this.cardValue(b,hand)).slice(0,count).map(c=>c.id);}
 recipeValue(p,hand,recipe){
  const plan=planCraft(hand,recipe);if(!plan.ok)return -Infinity;
  const lethal=plan.damage>=this.players[1-p].hp;
  const safety=this.players[p].hp<=10&&!recipe.risk?12:0;
  return (lethal?100:0)+plan.damage*(1-recipe.risk)*10+safety-recipe.needs.length;
 }
 bestExchange(p,hand=this.players[p].hand){
  let best=null;
  for(const card of hand)for(const target of EXCHANGE_TARGETS){
   if(card.key===target)continue;
   const trial=hand.map(c=>c.id===card.id?{...c,key:target}:c);
   for(const recipe of RECIPES){
    const value=this.recipeValue(p,trial,recipe);if(!Number.isFinite(value))continue;
    const score=value+this.cardValue(card,hand)*-.01;
    if(!best||score>best.score)best={id:card.id,target,recipeId:recipe.id,score};
   }
  }
  return best;
 }
 preservationScore(p,hand){
  const ready=RECIPES.map(r=>this.recipeValue(p,hand,r)).filter(Number.isFinite);
  // Complete recipes always outrank hands that need another exchange or draw.
  if(ready.length)return 10000+Math.max(...ready)+ready.length*.1;
  if(!this.players[p].reforged){const exchange=this.bestExchange(p,hand);if(exchange)return 1000+exchange.score;}
  const progress=Math.max(0,...RECIPES.map(r=>{
   const plan=planCraft(hand,r);return (r.needs.length-plan.missing.length)/r.needs.length*100+plan.damage;
  }));
  return progress+hand.reduce((sum,c)=>sum+this.cardValue(c,hand),0)*.01;
 }
 chooseDiscards(p,count){
  const hand=this.players[p].hand;if(count<=0)return [];if(count>=hand.length)return hand.map(c=>c.id);
  let best=null;const keepCount=hand.length-count;
  const visit=(start,kept)=>{
   if(kept.length===keepCount){
    const score=this.preservationScore(p,kept);
    if(!best||score>best.score)best={score,ids:new Set(kept.map(c=>c.id))};return;
   }
   for(let i=start;i<=hand.length-(keepCount-kept.length);i++)visit(i+1,[...kept,hand[i]]);
  };
  visit(0,[]);return hand.filter(c=>!best.ids.has(c.id)).map(c=>c.id);
 }
 chooseRecipe(p){
  const options=RECIPES.filter(r=>planCraft(this.players[p].hand,r).ok);if(!options.length)return null;
  const hp=this.players[p].hp;
  const lethal=options.filter(r=>planCraft(this.players[p].hand,r).damage>=this.players[1-p].hp).sort((a,b)=>a.risk-b.risk);if(lethal.length)return lethal[0];
  const cold=options.filter(r=>!r.risk),hot=options.filter(r=>r.risk);
  const pool=hp>10&&hot.length&&this.random()<.7?hot:cold.length?cold:options;
  return pool.sort((a,b)=>planCraft(this.players[p].hand,b).damage-planCraft(this.players[p].hand,a).damage)[0];
 }
 aiStep(){
  if(this.actor!==1||this.phase==='over')return 'done';
  if(this.phase==='ai-overflow'){this.trim(1,this.chooseDiscards(1,this.players[1].hand.length-MAX_HAND));return 'trim';}
  if(this.phase==='risk'){const hand=this.players[1].hand;if(this.players[1].hp<=5&&hand.length>=2)this.resolveRisk('discard',this.chooseDiscards(1,2));else this.resolveRisk('damage');return 'risk';}
  if(this.phase!=='ai')return 'done';
  const player=this.players[1];if(player.crafted){this.endTurn(1);return 'end';}
  let recipe=this.chooseRecipe(1);
  if(!recipe&&!player.reforged){
   const exchange=this.bestExchange(1);
   if(exchange){this.reforge(1,exchange.id,exchange.target);return 'reforge';}
  }
  recipe=this.chooseRecipe(1);if(recipe){this.craft(1,recipe.id);return 'craft';}
  this.log('隔壁掌柜收拢材料，等待下次开炉。');this.endTurn(1);return 'end';
 }
}
