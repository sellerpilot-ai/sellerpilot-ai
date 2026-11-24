import { $,state,toast } from './core.js';
import { verifiedUser } from './supabase-client.js';
import { v19Store } from './workspace.js';
import { download } from './csv.js';

const requestTypes={access:'Access my personal data',correct:'Correct my personal data',delete:'Delete my account and associated data',restrict:'Restrict or object to processing'};
let generation=0,pending=false;
export function v37Reset(){generation++;pending=false;if($('v37-status'))$('v37-status').textContent='';if($('v37-request-type'))$('v37-request-type').value='access';}
const clone=x=>JSON.parse(JSON.stringify(x));
export function workspaceExport(user,products,workspace,preferences,shortlist,now=new Date()){
 if(!user?.id||!Array.isArray(products)||products.some(p=>p.user_id!==user.id)||!workspace)throw Error('A complete, matching workspace sync is required.');
 return {format:'sellerpilot-workspace-export',version:37,exported_at:now.toISOString(),scope:'Synced workspace and current device account preferences; excludes authentication logs, provider records and unsaved drafts.',account:{id:user.id,email:user.email||''},products:clone(products.map(({id,user_id,title,description,tags,price,sku,attributes,created_at,updated_at})=>({id,user_id,title,description,tags,price,sku,attributes,created_at,updated_at}))),research_workspace:clone(workspace),device_preferences:{editorial:clone(preferences),keyword_shortlist:clone(shortlist)}};
}
async function run(task){
 if(!state.ready||!state.uid||pending||state.busy)return;
 const uid=state.uid,serial=state.serial,n=++generation;pending=true;
 const current=()=>state.ready&&uid===state.uid&&serial===state.serial&&n===generation;
 try{const user=await verifiedUser();if(!current())return;task(user);if(current())$('v37-status').textContent='File prepared on this device.'}
 catch(e){if(current()){$('v37-status').textContent=e.message||'Could not prepare file.';toast('Privacy file could not be prepared.',true)}}
 finally{if(n===generation)pending=false}
}
export function v37Init(){
 $('v37-export').onclick=()=>run(user=>{if(!v19Store.loaded)throw Error('Refresh your catalogue and research workspace first.');const payload=workspaceExport(user,state.products,v19Store.data,state.preferences,state.shortlist);download('sellerpilot-workspace-data.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8')});
 $('v37-request').onclick=()=>run(user=>{const kind=requestTypes[$('v37-request-type').value];if(!kind)throw Error('Select a request type.');const body=['SellerPilot privacy request — not submitted','Request: '+kind,'Account email: '+(user.email||''),'Prepared: '+new Date().toISOString(),'Please confirm receipt, identity-verification steps, and how this request will be handled.','','This file has not been sent and does not change or delete any data.'].join('\n');download('sellerpilot-privacy-request.txt',body)});
}
