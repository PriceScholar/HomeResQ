import {NextResponse} from 'next/server';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {isAuthenticated,checkOrigin} from '../../../../lib/auth';
import {driveStatus,oauthURL,completeAuthorization,syncAllPage,disconnectGoogle} from '../../../../lib/drive-sync';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(obj,status=200)=>NextResponse.json(obj,{status,headers:{'Cache-Control':'no-store'}});
const fail=(m,status=400)=>reply({detail:m},status);
const sign=x=>createHmac('sha256',process.env.SESSION_SECRET||'').update(x).digest('base64url');
const home=()=>{
 const target=new URL('https://resqhome-office.vercel.app/');
 target.hash='settings';return target;
};
export async function GET(req,ctx){
 const {path:p}=await ctx.params,action=p?.[0];
 if(!isAuthenticated(req))return fail('Sign in to RESQHOME Office first',401);
 try{
  if(action==='status')return reply(await driveStatus());
  if(action==='connect'){
   const status=await driveStatus();if(!status.configured)return fail('Admin setup needed: configure Google Drive OAuth client ID and secret in Vercel.',503);
   const state=randomBytes(20).toString('hex');
   const signed=state+'.'+sign(state);
   const response=NextResponse.redirect(oauthURL(signed));
   response.cookies.set('resqhome_drive_oauth',signed,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/drive',maxAge:600});
   return response;
  }
  if(action==='callback'){
   const fromGoogle=new URL(req.url).searchParams;
   const state=fromGoogle.get('state')||'';
   const expected=req.cookies.get('resqhome_drive_oauth')?.value||'';
   const [nonce,mac]=state.split('.');
   const calc=nonce?sign(nonce):'';
   if(!nonce||!mac||!expected||state!==expected||mac.length!==calc.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(calc)))return fail('Google Drive connection expired; retry from Settings.',403);
   const dest=home();
   if(fromGoogle.get('error'))dest.searchParams.set('drive_error','consent_denied');
   else{
    const code=fromGoogle.get('code');
    if(!code)return fail('Google returned no authorization code',400);
    await completeAuthorization(code);dest.searchParams.set('drive','connected');
   }
   const response=NextResponse.redirect(dest);
   response.cookies.set('resqhome_drive_oauth','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/drive',maxAge:0});
   return response;
  }
  return fail('Not found',404);
 }catch(err){console.error('Google Drive connect:',err);return fail('Google Drive connection failed: '+String(err.message||err).slice(0,200),500)}
}
export async function POST(req,ctx){
 if(!isAuthenticated(req))return fail('Unauthorized',401);
 if(!checkOrigin(req))return fail('Invalid origin',403);
 const {path:p}=await ctx.params;
 try{
  if(p?.[0]==='sync-all'){
   const data=await req.json().catch(()=>({}));
   const offset=Math.max(0,Math.min(100000,Math.floor(Number(data.offset)||0)));
   return reply(await syncAllPage(offset));
  }
  if(p?.[0]==='disconnect'){await disconnectGoogle();return reply({ok:true})}
  return fail('Not found',404);
 }catch(err){console.error('Google Drive sync:',err);return fail(String(err.message||err).slice(0,250),500)}
}
