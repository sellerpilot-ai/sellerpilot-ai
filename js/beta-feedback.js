import { $,state,toast } from './core.js';
import { download } from './csv.js';
export function v32Reset(){if($('v32-notes'))$('v32-notes').value='';if($('v32-area'))$('v32-area').selectedIndex=0;if($('v32-outcome'))$('v32-outcome').selectedIndex=0}
export function v32Init(){
 $('v32-clear').onclick=v32Reset;
 $('v32-download').onclick=()=>{if(!state.ready)return;const text=['SellerPilot V32 beta feedback','Feature: '+$('v32-area').value,'Outcome: '+$('v32-outcome').value,'Notes: '+$('v32-notes').value.trim().slice(0,2000),'','No feedback has been submitted automatically.'].join('\n');download('sellerpilot-beta-feedback.txt',text,'text/plain;charset=utf-8');toast('Feedback file prepared on this device.')};
}
