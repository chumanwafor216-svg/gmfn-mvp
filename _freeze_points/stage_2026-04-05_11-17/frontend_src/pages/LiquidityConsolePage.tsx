import React, { useEffect, useState } from "react"
import { listBankCredits, getSelectedClanId } from "../lib/api"

export default function LiquidityConsolePage(){

  const clanId = getSelectedClanId()

  const [rows,setRows] = useState<any[]>([])

  async function load(){
    if(!clanId) return
    const res = await listBankCredits({ clan_id: clanId })
    setRows(res || [])
  }

  useEffect(()=>{
    load()
  },[])

  return (
    <div style={{maxWidth:1100,margin:"0 auto"}}>

      <h2>Liquidity Console</h2>

      <div style={{marginTop:20}}>

        {rows.length===0 && (
          <div>No credits available.</div>
        )}

        {rows.map((r,i)=>(
          <div key={i} style={{
            border:"1px solid #e2e8f0",
            padding:16,
            borderRadius:12,
            marginBottom:12
          }}>
            <div>User: {r.user_id}</div>
            <div>Amount: {r.amount} {r.currency}</div>
            <div>Source Event: {r.source_bank_event_id}</div>
          </div>
        ))}

      </div>

    </div>
  )
}