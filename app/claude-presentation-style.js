if(typeof document!=='undefined'&&!document.querySelector('link[data-claude-presentation]')){
 const link=document.createElement('link');link.rel='stylesheet';link.href='/67park-foundation-next/app/claude-presentation.css?v=20260914';link.dataset.claudePresentation='1';document.head.append(link);
}
if(typeof location!=='undefined'&&location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).get('motionQA')==='1')import('./presentation-qa.js');
