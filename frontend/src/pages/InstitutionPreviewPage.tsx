import React from "react";

export default function InstitutionPreviewPage() {
  return (
    <div style={{fontFamily:"system-ui, -apple-system, Segoe UI", background:"#f8fafc", minHeight:"100vh"}}>

      {/* COVER PAGE */}

      <section style={{
        height:"100vh",
        display:"flex",
        flexDirection:"column",
        justifyContent:"center",
        alignItems:"center",
        textAlign:"center",
        background:"#ffffff"
      }}>

        <img
          src="/assets/gmfn-wordmark.svg"
          style={{width:260, marginBottom:30}}
        />

        <h1 style={{fontWeight:800, fontSize:28, color:"#0B1F33"}}>
          Global Support Network
        </h1>

        <p style={{maxWidth:520, color:"#475569", lineHeight:1.6}}>
          A community trust network that helps people support one another
          through reputation, transparency and collective responsibility.
        </p>

        <div style={{marginTop:40, display:"flex", gap:16}}>
          <button style={btnPrimary}>Register</button>
          <button style={btnSecondary}>Sign in</button>
        </div>

      </section>


      {/* SIGN IN PAGE */}

      <section style={section}>
        <h2 style={title}>Sign in</h2>

        <div style={{maxWidth:420}}>
          <input placeholder="Email" style={input}/>
          <input placeholder="Password" type="password" style={input}/>
          <button style={btnPrimary}>Continue</button>
        </div>
      </section>


      {/* INTRO PAGE */}

      <section style={section}>
        <h2 style={title}>What GMFN does</h2>

        <p style={paragraph}>
          GMFN helps communities organize financial support based on trust,
          reputation and shared responsibility.
        </p>

        <ul style={{marginTop:20, lineHeight:1.8}}>
          <li>Members support each other through guarantees</li>
          <li>Trust grows only after successful repayment</li>
          <li>Community oversight prevents abuse</li>
          <li>Every action is recorded transparently</li>
        </ul>

        <p style={{marginTop:24}}>
          Questions? Contact the community coordinator.
        </p>

      </section>


      {/* DASHBOARD */}

      <section style={section}>
        <h2 style={title}>Dashboard</h2>

        {/* Identity Banner */}

        <div style={{
          display:"flex",
          alignItems:"center",
          gap:20,
          padding:20,
          borderRadius:16,
          background:"#ffffff",
          border:"1px solid #e2e8f0"
        }}>

          <div style={{
            width:70,
            height:70,
            borderRadius:"50%",
            background:"#e2e8f0"
          }}/>

          <div>
            <div style={{fontSize:20, fontWeight:700}}>
              Ngozi
            </div>

            <div style={{fontSize:13, color:"#64748b"}}>
              GMFN-A38291
            </div>

            <div style={{fontSize:13, color:"#64748b"}}>
              Aba Women Traders Circle
            </div>
          </div>

        </div>


        {/* Modules */}

        <div style={{
          marginTop:30,
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))",
          gap:20
        }}>

          <Module title="Community"/>
          <Module title="Loans"/>
          <Module title="Trust"/>
          <Module title="Settings"/>

        </div>

      </section>

    </div>
  );
}


function Module({title}:{title:string}){

  return(
    <div style={{
      padding:22,
      borderRadius:16,
      border:"1px solid #e2e8f0",
      background:"#ffffff"
    }}>
      <div style={{fontWeight:700}}>{title}</div>
      <div style={{fontSize:13,color:"#64748b",marginTop:6}}>
        Open {title.toLowerCase()} tools
      </div>
    </div>
  )
}


const section = {
  padding:60,
  maxWidth:1000,
  margin:"0 auto"
}

const title = {
  fontSize:26,
  fontWeight:800,
  color:"#0B1F33"
}

const paragraph = {
  marginTop:12,
  color:"#475569",
  maxWidth:640
}

const input = {
  display:"block",
  width:"100%",
  padding:12,
  marginTop:12,
  borderRadius:10,
  border:"1px solid #e2e8f0"
}

const btnPrimary = {
  marginTop:16,
  padding:"12px 20px",
  borderRadius:12,
  border:"none",
  background:"#0B1F33",
  color:"#ffffff",
  fontWeight:700,
  cursor:"pointer"
}

const btnSecondary = {
  marginTop:16,
  padding:"12px 20px",
  borderRadius:12,
  border:"1px solid #cbd5f5",
  background:"#ffffff",
  fontWeight:700,
  cursor:"pointer"
}