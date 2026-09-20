export const OBSTACLE_PRACTICE_URL='/67park-foundation-next/?map=obstacle&practice=1&bots=1&v=release-40c';
// Local course is deliberately not sent as an unsupported matchmaking mode.
export function obstaclePracticeCard(jsx,disabled){
 const props={href:disabled?undefined:OBSTACLE_PRACTICE_URL,'aria-disabled':disabled,
  title:disabled?'Leave your online room before starting a local race':'Race against four local bots'};
 return jsx.jsxs('div',{className:'community-game-option community-local-game',children:[
  jsx.jsxs('a',{...props,className:'community-game-launch','aria-label':'Obstacle Dash — local bot race',children:[
   jsx.jsx('span',{'aria-hidden':true,children:'🏃'}),jsx.jsx('b',{children:'Obstacle Dash'}),jsx.jsx('small',{children:'Hurdles · spinning bars · 4 bots'})]}),
  jsx.jsx('a',{...props,className:'community-bot-test','aria-label':'Play Obstacle Dash with bots',children:'Play with bots'})
 ]},'obstacle');
}
