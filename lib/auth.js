import { createHmac, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import {fetchRecord,saveRecord} from './store';
const COOKIE = 'resqhome_office_session';
const MAX_AGE = 60 * 60 * 24 * 7;
const DEFAULT_SECRET = 'c2Vzc2lvbl9zZWNyZXRfZGV2X2tleV9mb3JfcmVzcWhvbWVfb2ZmaWNlXzIwMjY=';
const DEFAULT_HASH = '102030405060708090a0b0c0d0e0f001:9ce4754c259b3aabc356259d55a4dd8b03126917803d3f090a141c46a151b6cd';

function isValidHash(h) {
  if (typeof h !== 'string') return false;
  const parts = h.split(':');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length === 64;
}

function secret(){
  const s = process.env.SESSION_SECRET;
  return (typeof s === 'string' && s.length >= 16) ? s : DEFAULT_SECRET;
}

function sign(payload){return createHmac('sha256',secret()).update(payload).digest('base64url')}

export async function verifyPassword(password){
  const override=await fetchRecord('auth','admin');
  const candidateHash = override?.hash || process.env.OFFICE_PASSWORD_HASH;
  const configured = isValidHash(candidateHash) ? candidateHash : DEFAULT_HASH;
  const [salt,hash]=configured.split(':');
  if(!salt||!hash || !password) return false;
  const candidate=scryptSync(password,salt,32);
  const expected=Buffer.from(hash,'hex');
  return expected.length===candidate.length && timingSafeEqual(candidate,expected);
}
export function makeSession(){
  const payload=Buffer.from(String(Date.now()+MAX_AGE*1000)).toString('base64url');
  return payload+'.'+sign(payload);
}
export function verifySessionToken(token){
  try{
    if(!secret()) return false;
    const parts=String(token||'').split('.');
    if(parts.length!==2 || !parts[0] || !parts[1])return false;
    const expected=Buffer.from(sign(parts[0]));const actual=Buffer.from(parts[1]);
    if(expected.length!==actual.length || !timingSafeEqual(expected,actual))return false;
    const expiry=Number(Buffer.from(parts[0],'base64url').toString());
    return Number.isFinite(expiry) && expiry>Date.now();
  }catch{return false}
}
export function isAuthenticated(req){
  const token = req.cookies?.get?.(COOKIE)?.value || '';
  return verifySessionToken(token);
}
function isHttpsRequest(req){
  if(!req) return process.env.NODE_ENV==='production';
  const proto=req.headers?.get?.('x-forwarded-proto');
  if(proto) return proto.split(',')[0].trim()==='https';
  const origin=req.headers?.get?.('origin');
  if(origin) return origin.startsWith('https://');
  return String(req.url||'').startsWith('https://');
}
export function setAuthCookie(response,value,req){
  const https=isHttpsRequest(req);
  response.cookies.set(COOKIE,value,{httpOnly:true,secure:https,sameSite:https?'none':'lax',path:'/',maxAge:MAX_AGE});
  return response;
}
export function clearAuthCookie(response,req){
  const https=isHttpsRequest(req);
  response.cookies.set(COOKIE,'',{httpOnly:true,secure:https,sameSite:https?'none':'lax',path:'/',maxAge:0});return response;
}
export function checkOrigin(req){
  const origin=req.headers.get('origin');if(!origin)return true;
  try{
    const originHost=new URL(origin).host;
    const host=req.headers.get('host');
    const forwardedHost=req.headers.get('x-forwarded-host');
    return originHost===host||(Boolean(forwardedHost)&&originHost===forwardedHost.split(',')[0].trim());
  }catch{return false}
}

export async function updatePassword(password){
 if(typeof password!=='string'||password.length<12||password.length>128) throw new Error('New password must be 12–128 characters');
 const salt=randomBytes(16).toString('hex');
 const hash=scryptSync(password,salt,32).toString('hex');
 await saveRecord('auth','admin',{hash:`${salt}:${hash}`,changed_at:new Date().toISOString()});
}
