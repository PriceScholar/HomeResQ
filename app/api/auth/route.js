import { NextResponse } from 'next/server';
import {verifyPassword,updatePassword,makeSession,isAuthenticated,setAuthCookie,clearAuthCookie,checkOrigin} from '../../../lib/auth';
export const runtime='nodejs';
export async function GET(request){return NextResponse.json({authenticated:isAuthenticated(request),configured:true})}
export async function POST(request){
  if(!checkOrigin(request))return NextResponse.json({detail:'Invalid request origin'}, {status:403});
  const {password} = await request.json().catch(()=>({}));
  if(!await verifyPassword(String(password||'')))return NextResponse.json({detail:'Incorrect password'}, {status:401});
  return setAuthCookie(NextResponse.json({ok:true}),makeSession());
}
export async function DELETE(request){if(!checkOrigin(request))return NextResponse.json({detail:'Invalid request origin'},{status:403});return clearAuthCookie(NextResponse.json({ok:true}));}

export async function PATCH(request){
 if(!checkOrigin(request)||!isAuthenticated(request))return NextResponse.json({detail:'Unauthorized'},{status:401});
 try{
  const {current_password,new_password}=await request.json();
  if(!await verifyPassword(String(current_password||'')))return NextResponse.json({detail:'Current password is incorrect'},{status:401});
  await updatePassword(new_password);
  return NextResponse.json({ok:true,message:'Password updated'});
 }catch(e){return NextResponse.json({detail:String(e?.message||'Could not update password')},{status:400})}
}
