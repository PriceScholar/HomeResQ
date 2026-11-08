'use client';
import {useState} from 'react';
export default function Login(){
 const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e){
  e.preventDefault();setBusy(true);setError('');
  try {const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
   if(!r.ok){const d=await r.json();throw new Error(d.detail||'Login failed')}location.reload();
  }catch(e){setError(e.message);setBusy(false)}
 }
 return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'linear-gradient(135deg,#eaf2f8,#f7fafe)'}}>
  <div style={{width:'100%',maxWidth:430,background:'#fff',border:'1px solid #dbe6f1',borderRadius:18,boxShadow:'0 26px 65px #0e345026',padding:35}}>
   <div style={{fontWeight:900,color:'#1a3a5b',fontSize:25,letterSpacing:-1}}>RESQ<span style={{color:'#3d8fbd'}}>HOME</span></div>
   <p style={{color:'#788da2',fontSize:11,fontWeight:800,letterSpacing:2,marginTop:4}}>PRIVATE OFFICE WORKSPACE</p>
   <h1 style={{fontSize:26,color:'#193651',marginTop:36,marginBottom:8}}>Welcome back</h1>
   <p style={{fontSize:13,lineHeight:1.6,color:'#73899e',marginBottom:28}}>Secure access to client records, quotations and invoices from mobile or desktop.</p>
   <form onSubmit={submit}>
    <label htmlFor="pwd" style={{fontSize:12,color:'#34516c',fontWeight:700}}>Office password</label>
    <input id="pwd" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter password" style={{width:'100%',marginTop:9,padding:'14px 13px',border:'1px solid #cbdce8',borderRadius:9,outline:'none',fontSize:14}} />
    {error&&<p role="alert" style={{color:'#b53038',fontSize:12}}>{error}</p>}
    <button disabled={busy} style={{width:'100%',marginTop:17,padding:14,border:0,borderRadius:9,color:'white',fontWeight:800,background:'#215887',cursor:'pointer'}}>{busy?'Signing in…':'Sign in to RESQHOME Office →'}</button>
   </form>
   <p style={{color:'#8ca0b1',fontSize:11,textAlign:'center',marginTop:25}}>HOME RESCUE TECHNICAL SERVICES LLC<br/>Commercial License 1191464</p>
  </div>
 </div>
}
