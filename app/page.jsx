import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Script from 'next/script';
import Login from './login';
export const dynamic='force-dynamic';
function isValid(token){
 try {
  const [a,b]=(token||'').split('.');if(!a||!b||!process.env.SESSION_SECRET||!process.env.OFFICE_PASSWORD_HASH)return false;
  const x=Buffer.from(createHmac('sha256',process.env.SESSION_SECRET).update(a).digest('base64url')); const y=Buffer.from(b);
  return x.length===y.length&&timingSafeEqual(x,y)&&Number(Buffer.from(a,'base64url').toString())>Date.now();
 }catch{return false}
}
export default async function Home(){
 const jar=await cookies();const valid=isValid(jar.get('resqhome_office_session')?.value);
 if(!valid)return <Login/>;
 return <><div id="app"><div className="boot-loader">RESQ<span>HOME</span> <small>OFFICE</small></div></div><Script src="/app.js" strategy="afterInteractive"/></>;
}
