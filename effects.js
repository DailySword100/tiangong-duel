import {RECIPES} from './game.js?v=20261125-5';

const arrow='<svg viewBox="0 0 300 32" aria-hidden="true"><path d="M12 16H275" stroke="#f5e1a5" stroke-width="3"/><path d="m270 6 24 10-24 10 5-10Z" fill="#fff3cc"/><path d="m25 16-15-9m15 9-15 9m27-9L22 7m15 9-15 9" stroke="#bb8053" stroke-width="3"/></svg>';
const sparks=Array.from({length:12},(_,i)=>`<span class="fx-spark" style="--angle:${i*30+8}deg;--reach:${66+(i%4)*18}px;--spark-delay:${(i%3)*18}ms"><i></i></span>`).join('');
const impact='<div class="fx-ink"></div><div class="fx-ring"></div><div class="fx-ring outer"></div><svg class="fx-cut" viewBox="0 0 240 240" aria-hidden="true"><path d="m25 145 98-41 89-47-63 57-82 23Z"/><path d="m73 24 57 87 43 101-48-69-25-70Z"/><path d="m16 82 90 30 112 52-100-24-56-30Z"/></svg>'+sparks;

/** Pure presentation description: never changes combat results. */
export function createBattleEffect(event){
 if(!event||![0,1].includes(event.p)||!['attack','explosion'].includes(event.type))return null;
 const recipe=RECIPES.find(r=>r.id===event.recipeId);if(!recipe)return null;
 const explosion=event.type==='explosion',incoming=event.p===1;
 const variant=explosion?'explosion':recipe.id;
 const heavy=explosion||['cannon','mine'].includes(recipe.id);
 const impactDelay=explosion?120:recipe.id==='musket'?390:recipe.id==='cannon'?570:recipe.id==='mine'?470:510;
 const duration=heavy?1650:1350;
 const damage=Number.isFinite(event.damage)?Math.max(0,event.damage):0;
 const target=explosion?event.p:1-event.p;
 const title=explosion?'炉火反噬':incoming?'工坊受击':'你方出击';
 const result=explosion?'材料尽毁 · 等待止损':`${target===0?'你的':'对方'}声望 −${damage}`;
 let flight='';
 if(!explosion){
  const count=recipe.id==='crossbow'?3:1;
  flight=Array.from({length:count},(_,i)=>`<div class="fx-flight" style="--flight-delay:${i*55}ms;--flight-offset:${(i-(count-1)/2)*13}px">${['bow','crossbow'].includes(recipe.id)?arrow:'<span class="fx-shot"></span>'}<span class="fx-trail"></span></div>`).join('');
 }
 const popup=explosion?'<strong>炸炉</strong><small>材料尽毁</small>':`<strong>−${damage}</strong><small>${target===0?'你的':'对方'}声望</small>`;
 return {
  variant,heavy,impactDelay,duration,attacker:event.p,target,explosion,
  className:`battle-fx is-active fx-${variant} ${incoming?'from-enemy':'from-player'}`,
  announcement:`${title}，${recipe.name}，${result}`,
  status:explosion?'炸炉失控':incoming?'工坊正在受击':`${recipe.name}出击`,
  html:`<div class="fx-screen-wash"></div><div class="fx-caption"><span class="fx-caption-type">${title}</span><strong>${recipe.name}</strong><span>${result}</span></div><div class="fx-source-flare"></div>${flight}<div class="fx-impact">${impact}</div><div class="fx-damage">${popup}</div>`
 };
}
