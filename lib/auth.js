import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
const COOKIE = 'resqhome_office_session';
const MAX_AGE = 60 * 60 * 24 * 7;
function secret(){return process.env.SESSION_SECRET || ''}
function sign(payload){return createHmac('sha256',secret()).update(payload).digest('base64url')}
export function verifyPassword(password){
  const configured=process.env.OFFICE_PASSWORD_HASH||'';
  const [salt,hash]=configured.split(':');
  if(!salt||!hash || !password)return false;
  const candidate=scryptSync(password,salt,32);
  const expected=Buffer.from(hash,'hex');
  return expected.length===candidate.length && timingSafeEqual(candidate,expected);
}
export function makeSession(){
  const payload=Buffer.from(String(Date.now()+MAX_AGE*1000)).toString('base64url');
  return payload+'.'+sign(payload);
}
export function isAuthenticated(req){
  if(!secret() || !process.env.OFFICE_PASSWORD_HASH) return false;
  const token = req.cookies?.get?.(COOKIE)?.value || '';
  const parts=token.split('.');
  if(parts.length!==2 || !parts[0] || !parts[1])return false;
  const expected=Buffer.from(sign(parts[0]));const actual=Buffer.from(parts[1]);
  if(expected.length!==actual.length || !timingSafeEqual(expected,actual))return false;
  const expiry=Number(Buffer.from(parts[0],'base64url').toString());
  return Number.isFinite(expiry) && expiry>Date.now();
}
export function setAuthCookie(response,value){
  response.cookies.set(COOKIE,value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:MAX_AGE});
  return response;
}
export function clearAuthCookie(response){
  response.cookies.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});return response;
}
export function checkOrigin(req){
  const origin=req.headers.get('origin');if(!origin)return true;
  try{return new URL(origin).host===req.headers.get('host')}catch{return false}
}
