import {Game,CARDS,RECIPES,planCraft} from './game.js?v=20261125-2';
const $=s=>document.querySelector(s);const game=new Game();let selected=new Set(),timer=null,toastTimer=null,epoch=0,lastEvent=null,discardRisk=false,shownEnd=false;
const typeNames={material:'材料',process:'工序',wild:'通用'};
const art={
 bow:'<path d="M35 8 Q98 43 35 80" stroke="#816842" stroke-width="6"/><path d="M35 8 L35 80" stroke="#9a9c87" stroke-width="1.5"/><path d="M18 44 H102 M92 39 L103 44 92 49" stroke-width="2"/><path d="M52 31l6 13-6 13" stroke="#a14833" stroke-width="3"/>',
 crossbow:'<path d="M20 27 Q60 1 103 27" stroke="#766547" stroke-width="6"/><path d="M20 27 L62 48 103 27" stroke="#8c957c" stroke-width="1.5"/><path d="M62 17 L62 78" stroke-width="10"/><path d="M62 8 L62 55" stroke="#b69b68" stroke-width="2"/><path d="M58 66 L77 66 77 72" stroke-width="3"/>',
 musket:'<path d="M12 68 L35 53 54 45" stroke="#866542" stroke-width="12"/><path d="M46 48 L106 19" stroke-width="8"/><path d="M48 53q13 14 17-5" stroke-width="3"/><path d="M90 23 L94 31 M77 29 L81 37" stroke="#b59d6f" stroke-width="3"/>',
 cannon:'<path d="M29 42 L94 18 106 38 38 57Z" fill="#455755"/><path d="M29 42 L94 18 106 38 38 57Z"/><path d="M86 22 L97 43 M45 38 L53 52" stroke="#b29a68" stroke-width="3"/><path d="M20 64 L92 64 78 48 41 52Z" fill="#8b704a" stroke="#8b704a"/><circle cx="39" cy="65" r="14" fill="#e4d8be" stroke-width="5"/><path d="M39 52v26m-13-13h26" stroke-width="2"/>',
 mine:'<path d="M29 58 Q28 32 59 29 Q89 31 91 58 L85 72 H35Z" fill="#52645c" stroke-width="2"/><path d="M42 34 Q46 53 43 69 M76 34 Q71 52 77 69 M32 53h55" stroke="#b09a6a" stroke-width="2"/><path d="M59 30 Q48 13 69 13 L76 20" stroke="#89744c" stroke-width="3"/><path d="M76 12v12m-6-6h12" stroke="#ad5034" stroke-width="2"/>'
};
function svg(id){return `<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[id]}</svg>`;}
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
function modal(html){$('#modal-content').innerHTML=html;if(!$('#modal').open)$('#modal').showModal();}
function closeModal(){$('#modal').close();}
function recipes(){const player=game.players[0];$('#recipes').innerHTML=RECIPES.map(r=>{
 const plan=planCraft(player.hand,r), can=game.canAct(0)&&!player.crafted&&plan.ok;let wildKey=null;
 if(plan.wildUsed){const usedKeys=plan.used.map(i=>player.hand[i].key);wildKey=r.needs.find(key=>!usedKeys.includes(key)&&CARDS[key].type==='material');}
 const needs=r.needs.map(key=>{const have=player.hand.some(c=>c.key===key),sub=wildKey===key;return `<span class="ingredient ${have?'have':sub?'substitute':'missing'}" title="${sub?'边角料替代':have?'已拥有':'缺少'}">${sub?'料代·':''}${CARDS[key].name}</span>`;}).join('');
 const missing=plan.missing.map(key=>CARDS[key].name).join('、');
 const label=player.crafted?'本回合已制造':!plan.ok?`缺：${missing}`:game.phase==='overflow'?'先整理手牌':game.actor===1?'等待你的回合':'开炉制造';
 return `<article class="recipe ${can?'ready':''}" aria-label="${r.name}配方"><span class="weapon-kind">${r.kind}</span><div class="weapon-art">${svg(r.id)}</div><h3>${r.name}</h3><div class="weapon-stats"><span>伤害 <b>${plan.ok?plan.damage:r.damage}</b></span><span class="${r.risk?'risk-label':'safe-label'}">${r.risk?'炸炉 30%':'稳妥无险'}</span></div><div class="ingredients">${needs}</div><button class="make-button" data-craft="${r.id}" title="${!plan.ok?'缺少：'+missing:label}" ${can?'':'disabled'}>${label}</button></article>`;
 }).join('');}
function render(){
 const player=game.players[0],ai=game.players[1];selected=new Set([...selected].filter(id=>player.hand.some(c=>c.id===id)));
 for(const [id,p] of [['player',player],['enemy',ai]]){$(`#${id}-hp`).textContent=p.hp;$(`#${id}-bar`).style.width=`${p.hp/20*100}%`;}
 $('#round').textContent=`第 ${game.round} 轮${game.round>=12?' · 炉火衰竭':''}`;$('#deck-count').textContent=game.deck.length;$('#discard-count').textContent=game.discard.length;
 $('#enemy-hand').innerHTML=ai.hand.map(()=>'<span class="card-back"></span>').join('');$('#enemy-hand').setAttribute('aria-label',`对方有${ai.hand.length}张手牌`);
 const statuses={player:player.crafted?'兵器已出炉':'轮到你了',ai:'掌柜思量中', 'ai-overflow':'掌柜整理库房',overflow:'请整理手牌',risk:game.actor===0?'炉火失控':'对方炸炉',over:game.winner===0?'你赢下了比试':'比试结束'};
 $('#turn-status').textContent=statuses[game.phase]||'比试开始';$('#turn-subtitle').textContent=game.actor===0?'筹材 · 开炉 · 制胜':'对方正在行动，请稍候';
 $('#hand-count').textContent=`${player.hand.length} / 7`;
 const selecting=game.actor===0&&['player','overflow','risk'].includes(game.phase);
 $('#hand').innerHTML=player.hand.length?player.hand.map(c=>{const data=CARDS[c.key];return `<button class="hand-card ${data.type} ${selected.has(c.id)?'selected':''}" data-card="${c.id}" aria-label="${data.name}，${typeNames[data.type]}，${data.note}" aria-pressed="${selected.has(c.id)}" ${selecting?'':'disabled'}><span class="card-type">${typeNames[data.type]}</span><span class="card-symbol">${data.mark}</span><strong class="card-name">${data.name}</strong><span class="card-desc">${data.note}</span></button>`;}).join(''):'<div class="empty-hand">库房暂空，下一回合再筹良材。</div>';
 $('#reforge').innerHTML=`熔炉重铸 <span>${player.reforged?1:0} / 1</span>`;
 const target=$('#exchange-target').value;
 $('#exchange-target').disabled=!game.canAct(0)||player.reforged;
 $('#reforge').disabled=!game.canAct(0)||player.reforged||selected.size!==1||player.hand.find(c=>selected.has(c.id))?.key===target;
 $('#end-turn').disabled=!game.canAct(0)&&game.phase!=='overflow'&&!discardRisk;
 if(game.phase==='overflow'){
  const n=player.hand.length-7;$('#selection-hint').textContent=`手牌超限：请选择 ${n} 张弃牌（已选 ${selected.size} 张）`;$('#end-turn').innerHTML=`确认弃牌 <span>弃置 ${n} 张后继续行动</span>`;$('#end-turn').disabled=selected.size!==n;
 }else if(discardRisk){$('#selection-hint').textContent=`请选择 2 张手牌止损（已选 ${selected.size} 张）`;$('#end-turn').innerHTML='弃牌止损 <span>弃 2 张，免受炸炉伤害</span>';$('#end-turn').disabled=selected.size!==2;}
 else{$('#selection-hint').textContent=selected.size?`已选 ${selected.size} 张手牌`:'点击手牌可选中，供熔炉重铸使用';$('#end-turn').innerHTML='结束回合 <span>交由隔壁掌柜行动</span>';}
 $('#craft-hint').textContent=player.crafted?'本回合制造机会已用完':'每回合限制造一次 · 成功后立即攻击';
 $('#reforge-note').textContent=player.reforged?'本回合换牌机会已用完':`选 1 张其他手牌，换取「${CARDS[target].name}」`;
 const ready=RECIPES.filter(r=>planCraft(player.hand,r).ok);
 const exchange=!player.reforged?game.bestExchange(0):null;
 const suggestion=exchange?`可以补齐：选中一张「${CARDS[player.hand.find(c=>c.id===exchange.id).key].name}」，将换取目标设为「${CARDS[exchange.target].name}」，重铸后可造${RECIPES.find(r=>r.id===exchange.recipeId).name}。`:'缺工序时，可通过重铸指定换取；边角料仍只替代材料。';
 $('#turn-tip').textContent=game.phase==='overflow'?'先弃掉多余手牌，才能继续制造与重铸。':discardRisk?'选择两张手牌后，点击「弃牌止损」。':game.actor===1?'隔壁掌柜正在筹材造兵……':player.crafted?'可以继续重铸，为下一回合准备，然后结束回合。':ready.length?`材料与工序已齐：${ready.map(r=>r.name).join('、')}。点击对应配方的「开炉制造」。`:suggestion;
 $('#logs').innerHTML=game.logs.map((message,i)=>`<div class="log-item">${i===0?'<span class="log-index">最新记事</span>':''}${message}</div>`).join('');recipes();animateEvent();
 if(game.phase==='risk'&&game.actor===0&&!discardRisk)showRisk();
 if(game.phase==='over'&&!shownEnd){shownEnd=true;showEnd();}
}
function animateEvent(){if(!game.event||game.event===lastEvent)return;lastEvent=game.event;const fx=$('#battle-fx');fx.className='battle-fx';void fx.offsetWidth;
 if(game.event.type==='explosion'){fx.textContent='炸炉';fx.classList.add('explosion');$('.arena').classList.add('shake');setTimeout(()=>$('.arena').classList.remove('shake'),450);}
 else{fx.innerHTML=`<span class="floating-damage">−${game.event.damage}</span>`;fx.classList.add('attack');}
}
function scheduleAI(){clearTimeout(timer);const version=epoch;if(game.actor!==1||game.phase==='over')return;timer=setTimeout(()=>{if(epoch!==version)return;game.aiStep();render();scheduleAI();},game.phase==='risk'?1000:850);}
function showRisk(){const canDiscard=game.players[0].hand.length>=2;modal(`<span class="rule-tag">炉火失控</span><h2 class="risk-heading">炸炉了！材料尽毁</h2><p>这次制造已经失败，制造机会与材料均已消耗。你可以承担 1 点声望损失，或弃置 2 张剩余手牌止损。</p><div class="modal-actions"><button class="secondary-button" id="take-hit">承担损失 · 声望 −1</button><button class="primary-button" id="choose-discard" ${canDiscard?'':'disabled'}>弃 2 张手牌</button></div>${!canDiscard?'<p>剩余手牌不足 2 张，无法弃牌止损。</p>':''}`);
 $('#take-hit').onclick=()=>{game.resolveRisk('damage');selected.clear();closeModal();render();};$('#choose-discard').onclick=()=>{discardRisk=true;selected.clear();closeModal();render();};}
function showEnd(){modal(`<span class="rule-tag">比试落定 · 第 ${game.round} 轮</span><div class="outcome-mark">${game.winner===0?'胜':game.winner===1?'惜败':'平'}</div><h2>${game.winner===0?'百炼成兵，技高一筹':game.winner===1?'炉火未熄，来日再战':'两座工坊，旗鼓相当'}</h2><p>你的声望 ${game.players[0].hp} · 隔壁工坊声望 ${game.players[1].hp}。材料的取舍与开炉的时机，决定每一次交锋。</p><div class="modal-actions"><button class="secondary-button" id="view-board">查看对局</button><button class="primary-button" id="play-again">再开一炉</button></div>`);$('#view-board').onclick=closeModal;$('#play-again').onclick=reset;}
function reset(){epoch++;clearTimeout(timer);selected.clear();discardRisk=false;shownEnd=false;lastEvent=null;$('#exchange-target').value='scrap';closeModal();game.reset();render();notify('新一轮比试开始，你先行动。');}
$('#hand').onclick=e=>{const card=e.target.closest('[data-card]');if(!card||card.disabled)return;const id=Number(card.dataset.card);if(selected.has(id))selected.delete(id);else selected.add(id);render();};
$('#recipes').onclick=e=>{const button=e.target.closest('[data-craft]');if(!button||button.disabled)return;const result=game.craft(0,button.dataset.craft);if(result.ok){selected.clear();render();}};
$('#exchange-target').onchange=render;
$('#reforge').onclick=()=>{const target=$('#exchange-target').value;if(game.reforge(0,[...selected][0],target)){selected.clear();render();notify(`重铸完成，换得「${CARDS[target].name}」。`);}};
$('#end-turn').onclick=()=>{if(game.phase==='overflow'){if(game.trim(0,[...selected]))selected.clear();render();return;}if(discardRisk){if(game.resolveRisk('discard',[...selected])){discardRisk=false;selected.clear();}render();return;}if(game.endTurn(0)){selected.clear();render();scheduleAI();}};
$('#restart').onclick=()=>{modal('<span class="rule-tag">重新开炉</span><h2>重新开始这场比试？</h2><p>当前对局进度将被清除，双方重新获得 20 点声望。</p><div class="modal-actions"><button class="secondary-button" id="cancel-restart">继续对局</button><button class="primary-button" id="confirm-restart">重新开局</button></div>');$('#cancel-restart').onclick=closeModal;$('#confirm-restart').onclick=reset;};
$('#rules').onclick=()=>{modal(`<span class="rule-tag">工坊手札 · 调整版</span><h2>以材造兵，以兵制胜</h2><p>你正与隔壁工坊掌柜比试。筹集材料、完成工序，先将对方的 20 点声望打至 0，即可获胜。</p><ul><li>双方起手各 5 张。自己的回合开始抽 2 张，超过 7 张时自行选择弃牌。</li><li>配方常驻工坊。每回合最多制造一次，成功后立即攻击，兵器随即消耗。</li><li>每回合可重铸一次：选一张手牌，指定换成「边角料」「熬胶缠筋」「冶铁钻孔」或「配比火药」，不占制造机会。同名牌不能互换；边角料也可以换成工序。</li><li>四种换取目标共用每回合一次机会。每次都是弃 1 张、换 1 张，手牌数量不变。</li><li>每次制造最多使用一张边角料，替代一种材料，伤害 −1；不能替代工序。</li><li>火器制造有 30% 概率炸炉，失去材料与制造机会；随后扣自己 1 点声望，或弃 2 张手牌免伤。</li><li>AI 遵守同样规则，也会主动换取所缺工序；弃牌时优先保留完整配方。对方手牌内容隐藏。</li></ul><p><b>本版默认：</b>公共牌库为 46 张，抽空后将弃牌洗回。通过重铸换得的边角料与工序均为临时牌，使用或弃置后移除。第 12 轮起，行动方每回合开始损失 1 点声望，避免僵局。</p><p>地雷配方为「铁＋硝石＋草木灰＋配比火药」，伤害 4，炸炉率 30%，制造成功后立即引爆。配方中的所有材料与工序均会消耗。</p><div class="modal-actions"><button class="primary-button" id="close-rules">明白了，继续比试</button></div>`);$('#close-rules').onclick=closeModal;};
$('#modal').addEventListener('cancel',e=>{if(game.phase==='risk'&&game.actor===0&&!discardRisk)e.preventDefault();});
render();
