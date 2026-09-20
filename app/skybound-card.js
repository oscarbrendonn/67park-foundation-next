export const SKYBOUND_URL='/67park-foundation-next/skybound-soft/?v=skybound-44';
// Local course is deliberately not sent as an unsupported matchmaking mode.
export function skyboundCard(jsx,disabled){
 const props={href:disabled?undefined:SKYBOUND_URL,'aria-disabled':disabled,
  title:disabled?'Leave your online room before starting a local race':'Explore the original Skybound course'};
 return jsx.jsxs('div',{className:'community-game-option community-local-game',children:[
  jsx.jsxs('a',{...props,className:'community-game-launch','aria-label':'Skybound — solo parkour',children:[
   jsx.jsx('span',{'aria-hidden':true,children:'🏃'}),jsx.jsx('b',{children:'Skybound'}),jsx.jsx('small',{children:'Stars · checkpoints · jump pads'})]}),
  jsx.jsx('a',{...props,className:'community-bot-test','aria-label':'Play Skybound solo',children:'Play solo'})
 ]},'skybound');
}
