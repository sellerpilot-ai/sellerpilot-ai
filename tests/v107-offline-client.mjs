// V107 offline preview only. This file is never imported by the deployed app.
const user={id:'offline-preview-user',email:'fictional-preview@example.invalid'};
const stamp='2026-11-25T00:00:00.000Z';
let serial=0,signedIn=true;
const clone=x=>structuredClone(x);
const product=(title,description,tags,price)=>({id:'preview-'+(++serial),user_id:user.id,title,description,tags,price,sku:'',attributes:{},created_at:stamp,updated_at:stamp});
let products=[
 product('Minimalist Gold Tone Bracelet','Simple bracelet for everyday wear.','bracelet,gold jewellery,bracelet',18.5),
 product('Gift mug','Ceramic mug with a floral design. Holds 330 ml. Hand wash recommended.','mug,flower mug,ceramic mug',12),
 product('Cotton canvas tote bag','Reusable cotton canvas tote, 38 cm by 42 cm. Printed leaf design.','tote bag,canvas tote,leaf design,cotton bag',14)
],workspace=null;
const ok=data=>({data:clone(data),error:null});
const fail=message=>({data:null,error:{message}});
const matches=(row,filters)=>filters.every(([key,value])=>row[key]===value);
export function createClient(){
 return {
  auth:{
   onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},
   async getSession(){return ok({session:signedIn?{user}:null})},
   async getUser(){return ok({user:signedIn?user:null})},
   async signOut(){signedIn=false;return ok(null)},
   async signInWithPassword(){return fail('Offline preview: reload to restart. Never enter real credentials.')},
   async resetPasswordForEmail(){return fail('Password recovery is unavailable offline.')},
   async updateUser(){return fail('Account changes are unavailable offline.')}
  },
  functions:{async invoke(){return fail('Offline preview: external services are disabled. No request was made.')}},
  from(table){
   const filters=[];let op='read',payload,done=false,result;
   const execute=()=>{
    if(done)return result;done=true;
    if(!signedIn)return result=fail('Preview signed out. Reload to restart.');
    if(!['products','sellerpilot_workspace_v19'].includes(table))return result=fail('Unsupported offline fixture table');
    const rows=table==='products'?products:workspace?[workspace]:[];
    let selected=rows.filter(row=>matches(row,filters));
    if(op==='insert'){
     const inputs=Array.isArray(payload)?payload:[payload];
     if(inputs.some(v=>v?.user_id!==user.id))return result=fail('Invalid preview owner');
     if(table==='products'){
      selected=inputs.map(v=>({...product(v.title,v.description,v.tags,v.price),...clone(v),user_id:user.id}));
      products.push(...selected);
     }else{
      if(workspace||inputs.length!==1)return result=fail('Duplicate preview workspace');
      workspace={...clone(inputs[0]),updated_at:new Date().toISOString()};selected=[workspace];
     }
    }
    if(op==='update'){
     if(payload?.user_id&&payload.user_id!==user.id)return result=fail('Invalid preview owner');
     selected.forEach(row=>Object.assign(row,clone(payload)));
    }
    if(op==='delete'){
     if(table!=='products')return result=fail('Unsupported preview deletion');
     products=products.filter(row=>!selected.includes(row));
    }
    return result=ok(selected);
   };
   const q={
    select(){return q},order(){return q},eq(key,value){filters.push([key,value]);return q},
    insert(value){op='insert';payload=value;return q},update(value){op='update';payload=value;return q},delete(){op='delete';return q},
    async range(start,end){const res=execute();return res.error?res:ok(res.data.slice(start,end+1))},
    async maybeSingle(){const res=execute();return res.error?res:ok(res.data[0]??null)},
    async single(){const res=execute();return res.error?res:res.data.length===1?ok(res.data[0]):fail('Expected one preview record')},
    then(resolve,reject){return Promise.resolve(execute()).then(resolve,reject)}
   };return q;
  }
 };
}
