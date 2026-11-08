import { NextResponse } from 'next/server';
import {verifyPassword,makeSession,isAuthenticated,setAuthCookie,clearAuthCookie,checkOrigin} from '../../../lib/auth';
export const runtime='nodejs';
export async function GET(request){return NextResponse.json({authenticated:isAuthenticated(request),configured:!!(process.env.OFFICE_PASSWORD_HASH&&process.env.SESSION_SECRET)})}
export async function POST(request){
  if(!checkOrigin(request))return NextResponse.json({detail:'Invalid request origin'}, {status:403});
  const {password} = await request.json().catch(()=>({}));
  if(!verifyPassword(String(password||'')))return NextResponse.json({detail:'Incorrect password'}, {status:401});
  return setAuthCookie(NextResponse.json({ok:true}),makeSession());
}
export async function DELETE(request){if(!checkOrigin(request))return NextResponse.json({detail:'Invalid request origin'},{status:403});return clearAuthCookie(NextResponse.json({ok:true}));}
