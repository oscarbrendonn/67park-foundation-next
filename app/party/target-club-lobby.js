// The weekly table belongs to the shared lobby, never to the aiming surface.
// Mount into the existing lobby without changing its React-owned controls.
export function createTargetLobby({sync,onError=()=>{}}){
 let section=null,host=null,wasOpen=false,nextCheck=0,board=null,message='Open the lobby to load the weekly table.';
 function render(value=board,status=message){
  board=value;message=status;if(!section)return;
  section.querySelector('[data-board-status]').textContent=message||`Week of ${board.week} · All islands`;
  const list=section.querySelector('ol');list.replaceChildren();
  for(const row of board?.rows||[]){
   const li=document.createElement('li');li.dataset.you=String(!!row.you);
   const rank=document.createElement('span');rank.className='tc-rank';rank.textContent=String(row.rank);
   const name=document.createElement('b');name.textContent=row.name+(row.you?' · you':'');
   const score=document.createElement('strong');score.textContent=String(row.score);
   li.append(rank,name,score);list.append(li);
  }
  section.querySelector('[data-board-empty]').hidden=!!board?.rows?.length||!board?.available;
  section.querySelector('[data-board-own]').textContent=board?.you?`Your best: ${board.you.score} points · #${board.you.rank}`:'Play a weekly round at the fairground stand to join.';
 }
 function step(enabled){
  if(performance.now()<nextCheck)return;nextCheck=performance.now()+400;
  const dialog=document.querySelector('.online-dialog'),scroll=dialog?.querySelector('.online-scroll');
  if(scroll&&(!section||!scroll.contains(section))){
   section?.remove();section=document.createElement('section');section.className='tc-lobby';section.setAttribute('aria-label','Weekly leaderboard');
   section.innerHTML='<div class="tc-lobby-heading"><span class="tc-lobby-badge" aria-hidden="true">01</span><div><small>WEEKLY LEADERBOARD</small><h2>Target Club</h2></div><span class="tc-lobby-tag">TOP 10</span></div><p data-board-status role="status"></p><ol aria-label="This week’s rankings"></ol><p data-board-empty hidden>The first place is still up for grabs.</p><div class="tc-lobby-own" data-board-own></div><small class="tc-lobby-note">Best completed round · Resets Monday 00:00 UTC</small>';
   const connection=scroll.querySelector('.online-connection');if(connection)connection.after(section);else scroll.prepend(section);
   render();
  }
  if(section)section.hidden=!enabled;
  const open=!!(enabled&&dialog?.open);
  if(open&&(!wasOpen||host!==dialog)){
   render(null,'Loading this week’s players…');
   sync().catch(e=>{render(null,e.message);onError(e);});
  }
  host=dialog;wasOpen=open;
 }
 return {step,render,dispose(){section?.remove();}};
}
