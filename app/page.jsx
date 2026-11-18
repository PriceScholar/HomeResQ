import { cookies } from 'next/headers';
import Script from 'next/script';
import Login from './login';
import DriveClient from './drive-client';
import { verifySessionToken } from '../lib/auth';
export const dynamic='force-dynamic';
export default async function Home(){
 const jar=await cookies();const valid=verifySessionToken(jar.get('resqhome_office_session')?.value);
 if(!valid)return <Login/>;
 return <><DriveClient/><div id="app"><div className="boot-loader">RESQ<span>HOME</span> <small>OFFICE</small></div></div><Script src="/app.js" strategy="afterInteractive"/></>;
}
