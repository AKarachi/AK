const {createElement:h,useState,useEffect,Fragment}=React;

// ── DB ───────────────────────────────────────────────────────────────────────
const EMPTY={clients:[],produits:[],magasins:[],commandes:[],transferts:[],approvHist:[],stockLogs:[]};
function gid(a){return a.length?Math.max(...a.map(x=>x.id))+1:1;}
function tCmd(c){return c.montantDirect||c.lignes.reduce((s,l)=>s+(l.amount||0),0);}
function cN(cs,id){return(cs.find(c=>c.id===id)||{}).nom||"—";}
function mN(ms,id){return(ms.find(m=>m.id===id)||{}).nom||"—";}
function pN(ps,id){return(ps.find(p=>p.id===id)||{}).nom||"—";}
function fmtDate(d){
  if(!d||typeof d!=="string")return d||"—";
  const m=d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return d;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
// Dette client = total commandes - total paiements
function calcDette(client,commandes){
  const totalCmds=commandes.filter(c=>c.clientId===client.id).reduce((s,c)=>s+tCmd(c),0);
  const totalPaie=(client.paiements||[]).reduce((s,p)=>s+(p.montant||0),0);
  return totalCmds-totalPaie;
}
// Stock disponible = stock initial - vendus - transferts sortants + transferts entrants
function stockDispo(mag,pid,commandes,transferts){
  const ini=((mag&&mag.stock)||{})[pid]||0;
  const vendu=commandes.filter(c=>c.magasinId===(mag&&mag.id)).flatMap(c=>c.lignes).filter(l=>l.produitId===pid).reduce((s,l)=>s+(l.qty||0),0);
  const sortant=(transferts||[]).filter(t=>t.deId===mag.id&&t.produitId===pid).reduce((s,t)=>s+(t.qty||0),0);
  const entrant=(transferts||[]).filter(t=>t.versId===mag.id&&t.produitId===pid).reduce((s,t)=>s+(t.qty||0),0);
  return ini-vendu-sortant+entrant;
}

// ── COLORS ───────────────────────────────────────────────────────────────────
const G={bg:"#09090f",card:"#13131e",d2:"#0f0f18",b1:"#1e1e2e",b2:"#1a1a26",
  txt:"#e2e0db",dim:"#888",mut:"#444",ac:"#5b5bf6",acL:"#8b8bf5",
  acBg:"#5b5bf615",acBd:"#5b5bf630",gr:"#22c55e",am:"#f59e0b",re:"#ef4444",te:"#a8e6cf"};

// ── COMPANY HEADER ───────────────────────────────────────────────────────────
const LOGO_B64 = "data:image/png;base64,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";
function CompanyHeader(){
  return h('div',{className:"print-header",style:{display:"flex",alignItems:"center",gap:"18px",padding:"14px 20px 12px",borderBottom:"2.5px solid #000",marginBottom:"16px",background:"#fff"}},
    h('img',{src:LOGO_B64,style:{height:"70px",objectFit:"contain"}}),
    h('div',{style:{flex:1}},
      h('div',{style:{fontFamily:"Arial Black,sans-serif",fontWeight:900,fontSize:"26px",letterSpacing:"1px",color:"#000",lineHeight:1}},"A.M.T. ENTERPRISE"),
      h('div',{style:{fontSize:"12px",color:"#333",marginTop:"4px"}},"Picton Street Banjul, The Gambia."),
      h('div',{style:{fontSize:"12px",color:"#333"}},"Mob: (+220) 7951835 / 7202290 / 7013030")
    )
  );
}

function PrintBtn({onClick,label}){
  return h('button',{onClick,style:{cursor:"pointer",border:"none",fontFamily:"inherit",background:"#1a1a26",color:"#888",padding:"5px 12px",borderRadius:"6px",fontSize:"11px",display:"inline-flex",alignItems:"center",gap:"5px"}},
    "🖨 "+(label||"Imprimer")
  );
}

function printSection(title, contentHtml){
  const win = window.open('','_blank','width=900,height=700');
  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <title>A.M.T. Enterprise — ${title}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background:#fff; padding: 20px; }
      .header { display:block; padding-bottom:14px; border-bottom:2.5px solid #000; margin-bottom:16px; }
      .header img { height:90px; width:auto; max-width:600px; object-fit:contain; display:block; transform:none; }
      .header-info .name { font-family: Arial Black, sans-serif; font-weight:900; font-size:24px; }
      .header-info .sub { font-size:11px; color:#333; margin-top:3px; }
      h2 { font-size:15px; margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:5px; }
      table { width:100%; border-collapse:collapse; font-size:11px; }
      th { background:#f0f0f0; padding:6px 8px; text-align:left; border:1px solid #ccc; font-size:10px; text-transform:uppercase; }
      td { padding:5px 8px; border:1px solid #ddd; }
      tr:nth-child(even) { background:#fafafa; }
      .footer { margin-top:20px; text-align:right; font-size:10px; color:#999; }
      .badge { display:inline-block; padding:1px 6px; border-radius:10px; font-size:10px; border:1px solid #ccc; }
      .red { color:#ef4444; } .green { color:#22c55e; } .blue { color:#5b5bf6; }
      @media print { @page { margin:15mm; } }
    </style>
    </head><body>
    <div class="header">
      <img src="${LOGO_B64}" alt="AMT"/>
    </div>
    ${contentHtml}
    <div class="footer">Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
    </body></html>
  `);
  win.document.close();
  setTimeout(()=>win.print(),400);
}



// ── STYLE HELPERS ────────────────────────────────────────────────────────────
const IS={background:"#1a1a26",border:"1px solid #2a2a3a",color:G.txt,padding:"7px 10px",borderRadius:"6px",fontSize:"12px",width:"100%"};
const card=(extra)=>({background:G.card,border:`1px solid ${G.b1}`,borderRadius:"9px",...extra});
const btn=(bg,color,extra)=>({cursor:"pointer",border:"none",fontFamily:"inherit",background:bg,color,padding:"7px 14px",borderRadius:"7px",fontSize:"13px",transition:"all .15s",...extra});
const tbh={padding:"9px 12px",textAlign:"left",color:G.mut,fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"};
const tbd=(extra)=>({padding:"8px 12px",...extra});

// ── MINI COMPONENTS ──────────────────────────────────────────────────────────
function Tag({label,color}){
  color=color||G.ac;
  return h('span',{style:{display:"inline-block",padding:"2px 8px",borderRadius:"20px",fontSize:"11px",fontWeight:600,background:color+"22",color,border:`1px solid ${color}44`,whiteSpace:"nowrap"}},label);
}
function Inp(props){return h('input',{style:{...IS,...(props.style||{})},...props});}
function Sel({value,onChange,children,style:s}){
  return h('select',{value,onChange,style:{...IS,...(s||{}),color:value?G.txt:G.mut}},children);
}
// EditableDate — affiche jj/mm/aaaa, clic sur ✏ pour modifier
function EditableDate({value,onChange}){
  const [editing,setEditing]=useState(false);
  if(editing){
    return h('input',{type:"date",value:value,autoFocus:true,
      onChange:e=>{if(e.target.value){onChange(e.target.value);setEditing(false);}},
      onBlur:()=>setEditing(false),
      style:{background:"#1a1a26",border:"1px solid #5b5bf6",color:"#e2e0db",padding:"2px 6px",borderRadius:"5px",fontSize:"11px",fontFamily:"inherit",cursor:"pointer",outline:"none"}
    });
  }
  return h('span',{style:{display:"inline-flex",alignItems:"center",gap:"5px",cursor:"pointer"},onClick:()=>setEditing(true)},
    h('span',{style:{color:"#777",fontSize:"12px"}},fmtDate(value)),
    h('span',{style:{fontSize:"10px",color:G.ac}},"✏")
  );
}
function Lbl({label,children,style:s}){
  return h('div',{style:s},
    h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"4px"}},label),
    children
  );
}
function TotalRow({cols,label,amount}){
  if(!amount||amount<=0)return null;
  return h('tr',{style:{borderTop:`2px solid ${G.b1}`,background:G.d2}},
    h('td',{colSpan:cols-1,style:{padding:"9px 12px",fontSize:"11px",color:G.mut}},label),
    h('td',{style:{padding:"9px 12px",color:G.te,fontWeight:700,whiteSpace:"nowrap"}},amount.toLocaleString()+" GMD")
  );
}
function EmptyState({icon,msg}){
  return h('div',{style:{...card(),padding:"50px 20px",textAlign:"center"}},
    h('div',{style:{fontSize:"36px",marginBottom:"10px"}},icon),
    h('div',{style:{color:G.mut,fontSize:"13px"}},msg)
  );
}
function SearchDrop({value,onChange,results,onSelect,selected,onClear,placeholder,getLabel,getSubLabel}){
  return h('div',null,
    h(Inp,{value,onChange:e=>onChange(e.target.value),placeholder,style:{marginBottom:"3px"}}),
    value&&!selected&&h('div',{style:{background:G.d2,border:"1px solid #2a2a3a",borderRadius:"6px",maxHeight:"150px",overflowY:"auto",position:"relative",zIndex:10}},
      results.length
        ?results.map(r=>h('div',{key:r.id,onClick:()=>onSelect(r),
            onMouseEnter:e=>e.currentTarget.style.background=G.b2,
            onMouseLeave:e=>e.currentTarget.style.background="transparent",
            style:{padding:"7px 11px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${G.b2}`,background:"transparent",fontSize:"12px",color:G.dim}},
            h('span',null,getLabel(r)),
            getSubLabel?h('span',{style:{fontSize:"10px",color:G.mut}},getSubLabel(r)):null
          ))
        :h('div',{style:{padding:"7px 11px",color:"#333",fontSize:"12px"}},"Aucun résultat")
    ),
    selected
      ?h('div',{style:{fontSize:"11px",color:G.gr,marginTop:"3px",display:"flex",alignItems:"center",gap:"6px"}},
          "✓ ",h('strong',null,getLabel(selected)),
          h('button',{onClick:onClear,style:{color:G.mut,background:"none",border:"none",cursor:"pointer",fontSize:"11px",marginLeft:"4px"}},"✕")
        )
      :value?h('div',{style:{fontSize:"10px",color:G.am,marginTop:"3px"}},"⚠ Cliquez sur un nom dans la liste"):null
  );
}

// ── EDITABLE LIGNE ───────────────────────────────────────────────────────────
function EditableLigne({l,produits,db,setDb,cmdId,T}){
  const [ed,setEd]=useState(null);
  const [ev,setEv]=useState("");
  function commit(field){
    let val=field==="dnote"?(ev.trim()||null):ev?Number(ev):null;
    setDb(p=>({...p,commandes:p.commandes.map(c=>{
      if(c.id!==cmdId)return c;
      const nl=c.lignes.map(x=>{
        if(x.produitId!==l.produitId)return x;
        const upd={...x,[field]:val};
        if(field==="qty"||field==="up"){const q=field==="qty"?(val||1):x.qty;const pr=field==="up"?(val||0):(x.up||0);if(q&&pr)upd.amount=q*pr;}
        return upd;
      });
      return {...c,lignes:nl};
    })}));
    setEd(null);if(T)T("Ligne mise à jour ✓");
  }
  const CI={...IS,padding:"3px 6px",fontSize:"11px",width:"80px"};
  function Cell({field,val,display,color,fw}){
    return h('td',{style:tbd({color:color||G.dim,fontWeight:fw||400,cursor:"pointer"}),onDoubleClick:()=>{setEd(field);setEv(val===null||val===undefined?"":String(val));},title:"Double-clic pour modifier"},
      ed===field
        ?h('input',{autoFocus:true,value:ev,type:field==="dnote"?"text":"number",style:CI,onChange:e=>setEv(e.target.value),onBlur:()=>commit(field),onKeyDown:e=>{if(e.key==="Enter")commit(field);if(e.key==="Escape")setEd(null);}})
        :display
    );
  }
  return h('tr',{className:"trh",style:{borderBottom:"1px solid #141420"}},
    h('td',{style:tbd({fontWeight:500})},pN(produits,l.produitId)),
    h(Cell,{field:"qty",val:l.qty,display:l.qty,color:G.dim}),
    h(Cell,{field:"up",val:l.up,display:l.up?l.up.toLocaleString():"—",color:G.mut}),
    h(Cell,{field:"amount",val:l.amount,display:l.amount?l.amount.toLocaleString()+" GMD":"—",color:l.amount?G.te:"#333",fw:l.amount?700:400}),
    h(Cell,{field:"dnote",val:l.dnote,display:l.dnote||"—",color:G.mut})
  );
}

// ── APP ──────────────────────────────────────────────────────────────────────
function App(){
  const [db,setDb]=useState(EMPTY);
  const [tab,setTab]=useState("home");
  const [toast,setToast]=useState(null);
  useEffect(()=>{setTimeout(()=>FirebaseDB.subscribe(setDb),1500);},[]);
  useEffect(()=>{FirebaseDB.save(db);},[db]);
  function T(msg,err){setToast({msg,err});setTimeout(()=>setToast(null),2800);}

  const tabs=[
    {id:"home",icon:"🏠",label:"Accueil",n:null},
    {id:"cmd", icon:"🧾",label:"Commandes",n:db.commandes.length},
    {id:"mag", icon:"🏪",label:"Magasins", n:db.magasins.length},
    {id:"cli", icon:"👥",label:"Clients",  n:db.clients.length},
    {id:"pro", icon:"📦",label:"Produits", n:db.produits.length},
  ];

  return h('div',{style:{height:"100vh",display:"flex",overflow:"hidden"}},
    h('div',{style:{width:"195px",background:"#0d0d14",borderRight:`1px solid ${G.b2}`,display:"flex",flexDirection:"column",padding:"18px 0",flexShrink:0}},
      h('div',{style:{padding:"0 15px 16px",borderBottom:`1px solid ${G.b2}`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"14px",color:"#fff"}},"SALES.DB"),
        h('div',{style:{fontSize:"9px",color:"#2a2a3a",letterSpacing:"1px",marginTop:"2px"}},"GESTION DES VENTES")
      ),
      h('nav',{style:{padding:"10px 8px",flex:1}},
        ...tabs.map(t=>h('button',{key:t.id,onClick:()=>setTab(t.id),style:{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:"7px",marginBottom:"3px",background:tab===t.id?G.acBg:"transparent",color:tab===t.id?G.acL:"#555",border:tab===t.id?`1px solid ${G.acBd}`:"1px solid transparent",fontSize:"13px",display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}},
          h('span',null,t.icon),
          h('span',{style:{flex:1}},t.label),
          t.n!==null?h('span',{style:{background:G.d2,color:t.n>0?"#666":"#2a2a3a",borderRadius:"8px",padding:"1px 6px",fontSize:"10px"}},t.n):null
        ))
      )
    ),
    h('div',{style:{flex:1,overflow:"auto",padding:"24px 28px"}},
      tab==="home"?h(Home,{db,setTab}):
      tab==="cmd"? h(Cmds,{db,setDb,T,setTab}):
      tab==="mag"? h(Mags,{db,setDb,T}):
      tab==="cli"? h(Clis,{db,setDb,T}):
      tab==="pro"? h(Pros,{db,setDb,T}):null
    ),
    toast?h('div',{style:{position:"fixed",bottom:"20px",right:"20px",background:toast.err?"#2a0f0f":"#0f1f10",border:`1px solid ${toast.err?G.re:G.gr}`,color:G.txt,padding:"10px 16px",borderRadius:"8px",fontSize:"13px",zIndex:999,animation:"fu .2s ease"}},toast.msg):null
  );
}

// ── HOME ─────────────────────────────────────────────────────────────────────
function Home({db,setTab}){
  const {clients,produits,magasins,commandes}=db;
  const [search,setSearch]=useState("");
  const [fM,setFM]=useState("");
  const [fA,setFA]=useState("");
  const [fB,setFB]=useState("");
  const [det,setDet]=useState(null);
  const today=new Date().toISOString().slice(0,10);

  const rows=[...commandes].filter(c=>{
    if(fM&&c.magasinId!==Number(fM))return false;
    if(fA&&c.date<fA)return false;
    if(fB&&c.date>fB)return false;
    if(search){const s=search.toLowerCase();
      if(!cN(clients,c.clientId).toLowerCase().includes(s)&&!mN(magasins,c.magasinId).toLowerCase().includes(s)&&!String(c.id).includes(s)&&!c.lignes.some(l=>pN(produits,l.produitId).toLowerCase().includes(s)))return false;}
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);

  if(det!==null){
    const c=commandes.find(x=>x.id===det);
    if(!c){setDet(null);return null;}
    const tot=tCmd(c);
    return h('div',{className:"fu"},
      h('button',{onClick:()=>setDet(null),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",fontSize:"13px",marginBottom:"18px"}},"← Accueil"),
      h('div',{style:{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"10px",marginBottom:"18px"}},
        h('div',null,
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},`Commande #${c.id}`),
          h('div',{style:{display:"flex",alignItems:"center",gap:"8px",marginTop:"5px"}},
            h('span',{style:{color:G.mut,fontSize:"11px"}},"📅 Date :"),
            h('input',{type:"date",value:c.date,
              onChange:e=>{const v=e.target.value;if(v)setDb(p=>({...p,commandes:p.commandes.map(x=>x.id===c.id?{...x,date:v}:x)}));T("Date modifiée ✓");},
              style:{background:"#1a1a26",border:"1px solid #2a2a3a",color:"#e2e0db",padding:"4px 8px",borderRadius:"6px",fontSize:"12px",fontFamily:"inherit",cursor:"pointer"}
            })
          )
        ),
        tot>0?h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:G.te}},tot.toLocaleString()+" GMD"):null
      ),
      h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}},
        h('div',{style:card({padding:"12px 14px"})},h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",marginBottom:"5px"}},"Client"),h('div',{style:{fontWeight:600}},cN(clients,c.clientId))),
        h('div',{style:card({padding:"12px 14px"})},h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",marginBottom:"5px"}},"Magasin"),h('div',{style:{fontWeight:600,color:G.acL}},"🏪 "+mN(magasins,c.magasinId)))
      ),
      h('div',{style:card({overflow:"hidden"})},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["Produit","Qté","Prix","Montant","Note"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...c.lignes.map((l,i)=>h('tr',{key:i,style:{borderBottom:"1px solid #141420"}},
              h('td',{style:tbd({fontWeight:500})},pN(produits,l.produitId)),
              h('td',{style:tbd({color:G.dim})},l.qty),
              h('td',{style:tbd({color:G.mut})},l.up?l.up.toLocaleString():"—"),
              h('td',{style:tbd({color:l.amount?G.te:"#333",fontWeight:l.amount?700:400})},l.amount?l.amount.toLocaleString()+" GMD":"—"),
              h('td',{style:tbd({color:G.mut})},l.dnote||"—")
            )),
            h(TotalRow,{cols:5,label:"TOTAL",amount:tot})
          )
        )
      )
    );
  }

  const totalAmt=commandes.reduce((s,c)=>s+tCmd(c),0);
  const totalDette=clients.reduce((s,cl)=>s+Math.max(0,calcDette(cl,commandes)),0);
  const stats=[
    {icon:"🧾",l:"Commandes",v:commandes.length,c:G.ac},
    {icon:"👥",l:"Clients",v:clients.length,c:G.acL},
    {icon:"🏪",l:"Magasins",v:magasins.length,c:"#a78bfa"},
    {icon:"📦",l:"Produits",v:produits.length,c:"#7c6fcd"},
    {icon:"💰",l:"Total ventes",v:totalAmt>0?totalAmt.toLocaleString()+" GMD":"—",c:G.te},
    {icon:"⚠️",l:"Dettes clients",v:totalDette>0?totalDette.toLocaleString()+" GMD":"✓ 0",c:totalDette>0?G.re:G.gr},
  ];
  const hf=search||fM||fA||fB;
  const rowTotal=rows.reduce((s,c)=>s+tCmd(c),0);

  return h('div',{className:"fu"},
    h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"22px",marginBottom:"4px"}},"Tableau de bord"),
    h('div',{style:{color:G.mut,fontSize:"12px",marginBottom:"18px"}},"Vue d'ensemble"),
    h('div',{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"10px",marginBottom:"20px"}},
      ...stats.map((s,i)=>h('div',{key:i,style:card({padding:"12px 14px"})},
        h('div',{style:{fontSize:"18px",marginBottom:"4px"}},s.icon),
        h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px"}},s.l),
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"16px",color:s.c}},s.v)
      ))
    ),
    h('div',{style:card({padding:"13px 15px",marginBottom:"13px"})},
      h('div',{style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"10px"}},
        h(Lbl,{label:"Recherche"},h(Inp,{value:search,onChange:e=>setSearch(e.target.value),placeholder:"🔍 Client, produit, magasin, N°..."})),
        h(Lbl,{label:"Magasin"},h(Sel,{value:fM,onChange:e=>setFM(e.target.value)},
          h('option',{value:""},"Tous"),
          ...magasins.map(m=>h('option',{key:m.id,value:m.id},m.nom))
        )),
        h(Lbl,{label:"Du"},h(Inp,{type:"date",value:fA,onChange:e=>setFA(e.target.value)})),
        h(Lbl,{label:"Au"},h(Inp,{type:"date",value:fB,onChange:e=>setFB(e.target.value)}))
      ),
      hf?h('div',{style:{marginTop:"8px",display:"flex",gap:"10px",alignItems:"center"}},
        h('span',{style:{fontSize:"11px",color:G.acL,fontWeight:600}},`${rows.length} / ${commandes.length}`),
        h('button',{onClick:()=>{setSearch("");setFM("");setFA("");setFB("");},style:{fontSize:"11px",color:G.re,background:G.re+"15",border:`1px solid ${G.re}30`,padding:"3px 10px",borderRadius:"5px",cursor:"pointer"}},"✕ Réinitialiser")
      ):null
    ),
    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}},
      h('div',{style:{fontSize:"11px",color:G.mut}},`${rows.length} commande(s)`),
      h('button',{onClick:()=>setTab("cmd"),style:btn(G.ac,"#fff")},"+ Nouvelle commande")
    ),
    commandes.length===0?h(EmptyState,{icon:"🧾",msg:"Aucune commande — créez d'abord des magasins, produits et clients"}):
    rows.length===0?h('div',{style:card({padding:"30px",textAlign:"center",color:G.mut,fontSize:"12px"})},"Aucun résultat"):
    h('div',{style:card({overflow:"hidden"})},
      h('div',{style:{overflowX:"auto"}},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["N°","Date","Client","Magasin","Produits","Montant",""].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...rows.map((c,i)=>{
              const tot=tCmd(c);const isT=c.date===today;
              return h('tr',{key:c.id,className:"trh",onClick:()=>setDet(c.id),style:{borderBottom:"1px solid #141420",background:isT?"#5b5bf608":i%2===0?"transparent":"rgba(255,255,255,.01)",cursor:"pointer"}},
                h('td',{style:tbd()},h('span',{style:{color:G.dim,fontWeight:700}},`#${c.id}`),isT?h('span',{style:{fontSize:"9px",background:G.am+"22",color:G.am,border:`1px solid ${G.am}33`,padding:"1px 5px",borderRadius:"10px",marginLeft:"5px"}},"auj."):null),
                h('td',{style:tbd({whiteSpace:"nowrap"})},h(EditableDate,{value:c.date,onChange:v=>setDb(p=>({...p,commandes:p.commandes.map(x=>x.id===c.id?{...x,date:v}:x)}))})),
                h('td',{style:tbd({fontWeight:600,color:"#d0cec9"})},cN(clients,c.clientId)),
                h('td',{style:tbd()},h(Tag,{label:c.magasinId?"🏪 "+mN(magasins,c.magasinId):"—",color:c.magasinId?G.ac:G.mut})),
                h('td',{style:tbd()},
                  c.montantDirect
                    ?h('span',{style:{fontSize:"10px",color:G.am,background:G.am+"15",border:`1px solid ${G.am}33`,padding:"2px 7px",borderRadius:"10px"}},"⚡ Rapide")
                    :[
                      ...c.lignes.slice(0,2).map((l,j)=>h('span',{key:j,style:{fontSize:"10px",color:G.dim,background:G.d2,padding:"2px 5px",borderRadius:"3px",marginRight:"3px"}},pN(produits,l.produitId)+" ×"+l.qty)),
                      c.lignes.length>2?h('span',{key:"m",style:{fontSize:"10px",color:G.mut}},`+${c.lignes.length-2}`):null
                    ]
                ),
                h('td',{style:tbd({color:tot>0?G.te:"#333",fontWeight:tot>0?700:400,whiteSpace:"nowrap"})},tot>0?tot.toLocaleString()+" GMD":"—"),
                h('td',{style:tbd({color:G.ac,fontSize:"11px"})},"→")
              );
            }),
            h(TotalRow,{cols:6,label:`${rows.length} commande(s)`,amount:rowTotal})
          )
        )
      ),
      h('div',{style:{padding:"6px 12px",borderTop:"1px solid #141420",fontSize:"10px",color:"#333"}},"Cliquez sur une ligne pour voir le détail")
    )
  );
}

// ── COMMANDES ────────────────────────────────────────────────────────────────
function Cmds({db,setDb,T,setTab}){
  const {clients,produits,magasins,commandes}=db;
  const [form,setForm]=useState(false);      // false | "rapide" | "detail"
  const [vue,setVue]=useState("toutes");     // "toutes" | "rapides" | "detailles"
  const [nc,setNc]=useState({clientId:"",magasinId:"",date:new Date().toISOString().slice(0,10),lignes:[],montantDirect:""});
  const [sCli,setSCli]=useState("");
  const [sPro,setSPro]=useState("");
  const [det,setDet]=useState(null);
  const mag=magasins.find(m=>m.id===Number(nc.magasinId))||null;
  const selCli=clients.find(c=>c.id===nc.clientId)||null;

  function create(){
    let cid=nc.clientId;
    if(!cid&&sCli){const m=clients.filter(c=>c.nom.toLowerCase()===sCli.toLowerCase());if(m.length===1)cid=m[0].id;}
    if(!cid)return T("Sélectionnez un client dans la liste",true);
    const id=gid(commandes);
    if(form==="rapide"){
      const montant=Number(nc.montantDirect);
      if(!montant||montant<=0)return T("Montant invalide",true);
      setDb(p=>({...p,commandes:[...p.commandes,{id,clientId:Number(cid),magasinId:null,date:nc.date,lignes:[{produitId:null,qty:1,up:montant,amount:montant,dnote:null}],montantDirect:montant}]}));
    } else {
      if(!nc.magasinId)return T("Sélectionnez un magasin",true);
      if(!nc.lignes.length)return T("Sélectionnez au moins un produit",true);
      setDb(p=>({...p,commandes:[...p.commandes,{id,clientId:Number(cid),magasinId:Number(nc.magasinId),date:nc.date,lignes:nc.lignes}]}));
    }
    setNc({clientId:"",magasinId:"",date:new Date().toISOString().slice(0,10),lignes:[],montantDirect:""});
    setSCli("");setSPro("");setForm(false);
    T(`Commande #${id} créée !`);
  }
  function toggleP(p){
    const has=nc.lignes.find(l=>l.produitId===p.id);
    if(has)setNc(prev=>({...prev,lignes:prev.lignes.filter(l=>l.produitId!==p.id)}));
    else setNc(prev=>({...prev,lignes:[...prev.lignes,{produitId:p.id,qty:1,up:null,amount:null,dnote:null}]}));
  }
  function updL(pid,f,v){setNc(prev=>({...prev,lignes:prev.lignes.map(l=>{if(l.produitId!==pid)return l;const upd={...l,[f]:f==="dnote"?(v||null):(v?Number(v):null)};if(f==="up"||f==="qty"){const q=f==="qty"?Number(v)||1:l.qty;const pr=f==="up"?Number(v)||0:l.up||0;upd.amount=q&&pr?q*pr:upd.amount;}return upd;})}))}
  function updQ(pid,v){setNc(prev=>({...prev,lignes:prev.lignes.map(l=>{if(l.produitId!==pid)return l;const q=Number(v)||1;const pr=l.up||0;return{...l,qty:q,amount:q&&pr?q*pr:l.amount};})}));}

  function doPrint(liste,titre){
    const rows=liste.map(c=>`<tr><td>#${c.id}</td><td>${fmtDate(c.date)}</td><td>${cN(clients,c.clientId)}</td><td>${mN(magasins,c.magasinId)||"—"}</td><td style="text-align:right">${tCmd(c)>0?tCmd(c).toLocaleString()+" GMD":"—"}</td></tr>`).join("");
    const total=liste.reduce((s,c)=>s+tCmd(c),0);
    printSection(titre,`<h2>${titre} (${liste.length})</h2><table><thead><tr><th>#</th><th>Date</th><th>Client</th><th>Magasin/Type</th><th>Montant</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:700">TOTAL</td><td style="font-weight:700;text-align:right">${total.toLocaleString()} GMD</td></tr></tfoot></table>`);
  }

  const magProds=mag?produits.filter(p=>(p.magasins||[]).includes(mag.id)):[];
  const fPros=magProds.filter(p=>p.nom.toLowerCase().includes(sPro.toLowerCase()));
  const fClis=[...clients].filter(c=>c.nom.toLowerCase().includes(sCli.toLowerCase())).sort((a,b)=>a.nom.localeCompare(b.nom));
  const sorted=[...commandes].sort((a,b)=>b.id-a.id);
  const rapides=sorted.filter(c=>c.montantDirect);
  const detailles=sorted.filter(c=>!c.montantDirect);
  const listeVue=vue==="rapides"?rapides:vue==="detailles"?detailles:sorted;
  const grandTotal=listeVue.reduce((s,c)=>s+tCmd(c),0);

  /* ── DETAIL VIEW ── */
  if(det!==null){
    const c=commandes.find(x=>x.id===det);
    if(!c){setDet(null);return null;}
    const tot=tCmd(c);
    return h('div',{className:"fu"},
      h('button',{onClick:()=>setDet(null),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",fontSize:"13px",marginBottom:"18px"}},"← Retour"),
      h('div',{style:{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"10px",marginBottom:"18px"}},
        h('div',null,
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},`Commande #${c.id}`),
          h('div',{style:{display:"flex",alignItems:"center",gap:"8px",marginTop:"5px"}},
            h('span',{style:{color:G.mut,fontSize:"11px"}},"📅 Date :"),
            h('input',{type:"date",value:c.date,
              onChange:e=>{const v=e.target.value;if(v)setDb(p=>({...p,commandes:p.commandes.map(x=>x.id===c.id?{...x,date:v}:x)}));T("Date modifiée ✓");},
              style:{background:"#1a1a26",border:"1px solid #2a2a3a",color:"#e2e0db",padding:"4px 8px",borderRadius:"6px",fontSize:"12px",fontFamily:"inherit",cursor:"pointer"}
            })
          )
        ),
        h('div',{style:{display:"flex",gap:"8px",alignItems:"center"}},
          tot>0?h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:G.te}},tot.toLocaleString()+" GMD"):null,
          h(PrintBtn,{onClick:()=>{
            const rows=c.lignes.map(l=>`<tr><td>${pN(produits,l.produitId)||"—"}</td><td>${l.qty||"—"}</td><td>${l.up?l.up.toLocaleString()+" GMD":"—"}</td><td style="text-align:right">${l.amount?l.amount.toLocaleString()+" GMD":"—"}</td><td>${l.dnote||""}</td></tr>`).join("");
            printSection(`Commande #${c.id}`,`
              <h2>Commande #${c.id} — ${fmtDate(c.date)}</h2>
              <table style="width:auto;margin-bottom:12px"><tr><th>Client</th><td>${cN(clients,c.clientId)}</td></tr><tr><th>Magasin</th><td>${mN(magasins,c.magasinId)||"—"}</td></tr></table>
              <table><thead><tr><th>Produit</th><th>Qté</th><th>Prix</th><th>Montant</th><th>Note</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">TOTAL</td><td style="font-weight:700;text-align:right">${tot.toLocaleString()} GMD</td><td></td></tr></tfoot></table>`);
          }})
        )
      ),
      h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}},
        h('div',{style:card({padding:"12px 14px"})},h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",marginBottom:"5px"}},"Client"),h('div',{style:{fontWeight:600}},cN(clients,c.clientId))),
        h('div',{style:card({padding:"12px 14px"})},h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",marginBottom:"5px"}},"Magasin"),h('div',{style:{fontWeight:600,color:G.acL}},"🏪 "+mN(magasins,c.magasinId)))
      ),
      h('div',{style:card({overflow:"hidden"})},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["Produit","Qté","Prix","Montant","Note"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...c.lignes.map((l,i)=>h(EditableLigne,{key:i,l,produits,db,setDb,cmdId:c.id,T})),
            h(TotalRow,{cols:5,label:"TOTAL",amount:tot})
          )
        )
      )
    );
  }

  /* ── MAIN VIEW ── */
  return h('div',{className:"fu"},

    /* ── Header ── */
    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}},
      h('div',null,
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},"Commandes"),
        h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"2px"}},`${commandes.length} commande(s)`)
      ),
      h('button',{
        onClick:()=>setForm(f=>f?"":false||"menu"),
        style:btn(form?"#c0392b":G.ac,"#fff",{fontSize:"13px"})
      },form?"✕ Fermer":"+ Nouvelle commande")
    ),

    /* ── Formulaire ajout ── */
    form?h('div',{style:{...card({padding:"16px",marginBottom:"16px"}),border:`1px solid ${G.b2}`}},
      /* Sélecteur de type si pas encore choisi */
      !form||form==="menu"?h('div',null,
        h('div',{style:{fontSize:"12px",color:G.mut,marginBottom:"12px",fontWeight:600}},"Choisir le type de commande :"),
        h('div',{style:{display:"flex",gap:"10px",flexWrap:"wrap"}},
          h('button',{onClick:()=>setForm("rapide"),style:{...btn(G.ac,"#fff",{fontSize:"13px",padding:"10px 20px"}),display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"3px",minWidth:"180px"}},
            h('span',{style:{fontSize:"15px",fontWeight:800}},"⚡ Rapide"),
            h('span',{style:{fontSize:"10px",opacity:.8}},"Date + montant direct")
          ),
          h('button',{onClick:()=>setForm("detail"),style:{...btn("#5a4fcf","#fff",{fontSize:"13px",padding:"10px 20px"}),display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"3px",minWidth:"180px"}},
            h('span',{style:{fontSize:"15px",fontWeight:800}},"📦 Détaillée"),
            h('span',{style:{fontSize:"10px",opacity:.8}},"Produits + magasin")
          )
        )
      ):null,

      /* Formulaire Rapide */
      form==="rapide"?h('div',null,
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.acL,marginBottom:"12px"}},"⚡ NOUVELLE COMMANDE RAPIDE"),
        !clients.length?h('div',{style:{color:G.re,fontSize:"12px"}},"⚠ ",h('button',{onClick:()=>setTab("cli"),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:"12px"}},"Créer un client →")):
        h('div',null,
          h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"14px"}},
            h(Lbl,{label:"Client *"},
              h(SearchDrop,{value:sCli,onChange:v=>{setSCli(v);setNc(p=>({...p,clientId:""}));},results:fClis,onSelect:c=>{setNc(p=>({...p,clientId:c.id}));setSCli(c.nom);},selected:selCli,onClear:()=>{setNc(p=>({...p,clientId:""}));setSCli("");},placeholder:"🔍 Rechercher un client...",getLabel:c=>c.nom})
            ),
            h(Lbl,{label:"Date *"},h(Inp,{type:"date",value:nc.date,onChange:e=>setNc(p=>({...p,date:e.target.value}))})),
            h(Lbl,{label:"Montant (GMD) *"},h(Inp,{type:"number",value:nc.montantDirect,onChange:e=>setNc(p=>({...p,montantDirect:e.target.value})),placeholder:"0"}))
          ),
          h('div',{style:{display:"flex",gap:"9px",marginTop:"4px"}},
            h('button',{onClick:create,style:btn(G.ac,"#fff")},"✓ Créer"),
            h('button',{onClick:()=>setForm("menu"),style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"← Retour")
          )
        )
      ):null,

      /* Formulaire Détaillé */
      form==="detail"?h('div',null,
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:"#b0a0ff",marginBottom:"12px"}},"📦 NOUVELLE COMMANDE DÉTAILLÉE"),
        !clients.length?h('div',{style:{color:G.re,fontSize:"12px"}},"⚠ ",h('button',{onClick:()=>setTab("cli"),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:"12px"}},"Créer un client →")):
        h('div',null,
          h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"14px"}},
            h(Lbl,{label:"Client *"},
              h(SearchDrop,{value:sCli,onChange:v=>{setSCli(v);setNc(p=>({...p,clientId:""}));},results:fClis,onSelect:c=>{setNc(p=>({...p,clientId:c.id}));setSCli(c.nom);},selected:selCli,onClear:()=>{setNc(p=>({...p,clientId:""}));setSCli("");},placeholder:"🔍 Rechercher un client...",getLabel:c=>c.nom})
            ),
            h(Lbl,{label:"Date *"},h(Inp,{type:"date",value:nc.date,onChange:e=>setNc(p=>({...p,date:e.target.value}))})),
            h(Lbl,{label:"Magasin *"},
              h(Sel,{value:nc.magasinId,onChange:e=>setNc(p=>({...p,magasinId:e.target.value,lignes:[]}))},
                h('option',{value:""},"— Choisir —"),
                ...magasins.map(m=>h('option',{key:m.id,value:m.id},"🏪 "+m.nom))
              )
            )
          ),
          nc.magasinId?h('div',null,
            h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}},
              h('div',{style:{fontSize:"10px",color:G.acL,textTransform:"uppercase",fontWeight:600}},"Produits — 🏪 "+(mag?mag.nom:"")),
              h('div',{style:{fontSize:"10px",color:G.mut}},`${nc.lignes.length} sélectionné(s)`)
            ),
            magProds.length===0?h('div',{style:{color:G.am,fontSize:"12px",padding:"8px",background:G.am+"11",borderRadius:"6px"}},"⚠ Ce magasin n'a aucun produit."):
            h(Fragment,null,
              h(SearchDrop,{value:sPro,onChange:v=>setSPro(v),results:fPros,onSelect:p=>{toggleP(p);setSPro("");},selected:null,onClear:()=>setSPro(""),placeholder:"🔍 Tapez un nom de produit...",getLabel:p=>p.nom,
                getSubLabel:p=>{const d=stockDispo(mag,p.id,commandes,db.transferts||[]);const sel=nc.lignes.some(l=>l.produitId===p.id);return "Stock: "+d+(sel?" · ✓ sélectionné":"");}}),
              nc.lignes.length>0?h('div',{style:{display:"flex",flexDirection:"column",gap:"6px",marginTop:"8px",marginBottom:"8px"}},
                ...nc.lignes.map(ligne=>{
                  const p=produits.find(x=>x.id===ligne.produitId);if(!p)return null;
                  return h('div',{key:p.id,style:{background:G.acBg,border:`1px solid ${G.acBd}`,borderRadius:"7px",padding:"8px 11px"}},
                    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}},
                      h('span',{style:{fontWeight:600,fontSize:"12px",color:"#c0beff"}},"✓ "+p.nom),
                      h('button',{onClick:()=>toggleP(p),style:{color:G.re,background:"none",border:"none",cursor:"pointer",fontSize:"12px"}},"✕")
                    ),
                    h('div',{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"5px"}},
                      ...([["Qté *","qty","number"],["Prix","up","number"],["Montant","amount","number"],["Note","dnote","text"]]).map(([l,f,t])=>
                        h(Lbl,{key:f,label:l},h(Inp,{type:t,value:f==="qty"?ligne.qty:(ligne[f]||""),onChange:e=>f==="qty"?updQ(p.id,e.target.value):updL(p.id,f,e.target.value),placeholder:"—",style:{fontSize:"11px",padding:"4px 7px"}}))
                      )
                    )
                  );
                }),
                nc.lignes.reduce((s,l)=>s+(l.amount||0),0)>0?h('div',{style:{background:G.d2,borderRadius:"7px",padding:"7px 11px",display:"flex",justifyContent:"space-between"}},
                  h('span',{style:{fontSize:"11px",color:G.mut}},`${nc.lignes.length} produit(s)`),
                  h('span',{style:{color:G.te,fontWeight:700,fontSize:"13px"}},nc.lignes.reduce((s,l)=>s+(l.amount||0),0).toLocaleString()+" GMD")
                ):null
              ):null
            )
          ):null,
          h('div',{style:{display:"flex",gap:"9px",marginTop:"12px"}},
            h('button',{onClick:create,style:btn("#5a4fcf","#fff")},"✓ Créer"),
            h('button',{onClick:()=>setForm("menu"),style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"← Retour")
          )
        )
      ):null
    ):null,

    /* ── Onglets de filtre + boutons imprimer ── */
    commandes.length>0?h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",flexWrap:"wrap",gap:"8px"}},
      /* Onglets */
      h('div',{style:{display:"flex",gap:"4px",background:G.d2,borderRadius:"8px",padding:"3px"}},
        [
          ["toutes","Toutes",sorted.length,null],
          ["rapides","⚡ Rapides",rapides.length,"#e67e22"],
          ["detailles","📦 Détaillées",detailles.length,"#8e44ad"]
        ].map(([v,label,count,col])=>
          h('button',{key:v,onClick:()=>setVue(v),style:{
            background:vue===v?(col||G.ac):"transparent",
            color:vue===v?"#fff":G.mut,
            border:"none",borderRadius:"6px",padding:"5px 12px",
            cursor:"pointer",fontSize:"12px",fontWeight:vue===v?700:400,
            transition:"all .15s"
          }},`${label} (${count})`)
        )
      ),
      /* Bouton imprimer contextuel */
      h(PrintBtn,{
        label:vue==="rapides"?"🖨 Rapides":vue==="detailles"?"🖨 Détaillées":"🖨 Toutes",
        onClick:()=>doPrint(
          listeVue,
          vue==="rapides"?"Commandes Rapides":vue==="detailles"?"Commandes Détaillées":"Toutes les Commandes"
        )
      })
    ):null,

    /* ── Table ── */
    commandes.length===0?h(EmptyState,{icon:"🧾",msg:"Aucune commande"}):
    listeVue.length===0?h('div',{style:{textAlign:"center",color:G.mut,padding:"30px",fontSize:"13px"}},"Aucune commande dans cette catégorie"):
    h('div',{style:card({overflow:"hidden"})},
      h('div',{style:{overflowX:"auto"}},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["N°","Date","Client","Magasin","Produits","Montant",""].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...listeVue.map((c,i)=>{
              const tot=tCmd(c);
              return h('tr',{key:c.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                h('td',{style:tbd({color:G.dim,fontWeight:700})},`#${c.id}`),
                h('td',{style:tbd({whiteSpace:"nowrap"})},h(EditableDate,{value:c.date,onChange:v=>setDb(p=>({...p,commandes:p.commandes.map(x=>x.id===c.id?{...x,date:v}:x)}))})),
                h('td',{style:tbd({fontWeight:600,color:"#d0cec9"})},cN(clients,c.clientId)),
                h('td',{style:tbd()},h(Tag,{label:"🏪 "+mN(magasins,c.magasinId)})),
                h('td',{style:tbd()},
                  c.montantDirect
                    ?h('span',{style:{fontSize:"10px",color:G.am,background:G.am+"15",border:`1px solid ${G.am}33`,padding:"2px 7px",borderRadius:"10px"}},"⚡ Commande rapide")
                    :[
                      ...c.lignes.slice(0,2).map((l,j)=>h('span',{key:j,style:{fontSize:"10px",color:G.dim,background:G.d2,padding:"2px 5px",borderRadius:"3px",marginRight:"3px"}},pN(produits,l.produitId))),
                      c.lignes.length>2?h('span',{key:"more",style:{fontSize:"10px",color:G.mut}},`+${c.lignes.length-2}`):null
                    ]
                ),
                h('td',{style:tbd({color:tot>0?G.te:"#333",fontWeight:tot>0?700:400,whiteSpace:"nowrap"})},tot>0?tot.toLocaleString()+" GMD":"—"),
                h('td',{style:tbd({display:"flex",gap:"5px"})},
                  h('button',{onClick:()=>setDet(c.id),style:{background:G.acBg,color:G.acL,border:`1px solid ${G.acBd}`,padding:"3px 8px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"Détail"),
                  h('button',{onClick:()=>{if(!confirm("Supprimer cette commande ?"))return;setDb(p=>({...p,commandes:p.commandes.filter(x=>x.id!==c.id)}));T("Commande supprimée ✓");},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
                )
              );
            }),
            h(TotalRow,{cols:6,label:`${listeVue.length} commande(s)`,amount:grandTotal})
          )
        )
      )
    )
  );
}

// ── MAGASINS ─────────────────────────────────────────────────────────────────
function Mags({db,setDb,T}){
  const {magasins,produits,commandes,clients}=db;
  const transferts=db.transferts||[];
  const approvHist=db.approvHist||[];
  const stockLogs=db.stockLogs||[];
  const [sel,setSel]=useState(null);
  const [addF,setAddF]=useState(false);
  const [nom,setNom]=useState("");
  const [editSt,setEditSt]=useState(false);
  const [st,setSt]=useState({});
  const [showTransfert,setShowTransfert]=useState(false);
  const [showApprov,setShowApprov]=useState(false);
  const [showHistApprov,setShowHistApprov]=useState(false);
  const [editNote,setEditNote]=useState(null); // log.id en cours d'édition
  const [noteVal,setNoteVal]=useState("");
  const [tr,setTr]=useState({produitId:"",versId:"",qty:"",date:new Date().toISOString().slice(0,10)});
  const [ap,setAp]=useState({produitId:"",qty:"",type:"TRUCK",date:new Date().toISOString().slice(0,10)});
  const mag=magasins.find(m=>m.id===sel)||null;

  function add(){if(!nom.trim())return T("Nom requis",true);const id=gid(magasins);setDb(p=>({...p,magasins:[...p.magasins,{id,nom:nom.trim().toUpperCase(),stock:{}}]}));setSel(id);setNom("");setAddF(false);T("Magasin créé !");}
  function del(id){if(commandes.some(c=>c.magasinId===id))return T("Ce magasin a des commandes",true);setDb(p=>({...p,magasins:p.magasins.filter(m=>m.id!==id)}));if(sel===id)setSel(null);T("Supprimé");}

  function startE(){
    const s={};
    const magProds=produits.filter(p=>(p.magasins||[]).includes(sel));
    magProds.forEach(p=>{s[p.id]=((mag&&mag.stock)||{})[p.id]||"";});
    setSt(s);setEditSt(true);
  }
  function saveS(){
    const oldStock=(mag&&mag.stock)||{};
    const ns={...oldStock};
    const changes=[];
    Object.entries(st).forEach(([pid,val])=>{
      const n=Number(val);
      const old=oldStock[Number(pid)]||0;
      if(n>0) ns[Number(pid)]=n;
      else delete ns[Number(pid)];
      if(n!==old){
        const pNom=produits.find(x=>x.id===Number(pid))?.nom||"?";
        changes.push({produitId:Number(pid),produitNom:pNom,avant:old,apres:n>0?n:0});
      }
    });
    const log={id:Date.now(),date:new Date().toISOString().slice(0,10),magasinId:sel,magasinNom:mag.nom,changes,note:"Modifié manuellement"};
    setDb(p=>({...p,
      magasins:p.magasins.map(m=>m.id===sel?{...m,stock:ns}:m),
      stockLogs:[...(p.stockLogs||[]),log]
    }));
    setEditSt(false);T("Stock enregistré !");
  }

  function doTransfert(){
    if(!tr.produitId)return T("Choisissez un produit",true);
    if(!tr.versId)return T("Choisissez le magasin destination",true);
    const qty=Number(tr.qty);
    if(!qty||qty<=0)return T("Quantité invalide",true);
    const dispo=stockDispo(mag,Number(tr.produitId),commandes,transferts);
    if(qty>dispo)return T(`Stock insuffisant (disponible: ${dispo})`,true);
    const id=Date.now();
    const newTr={id,produitId:Number(tr.produitId),deId:sel,versId:Number(tr.versId),qty,date:tr.date};
    setDb(p=>({...p,transferts:[...(p.transferts||[]),newTr]}));
    setTr({produitId:"",versId:"",qty:"",date:new Date().toISOString().slice(0,10)});
    setShowTransfert(false);T(`Transfert de ${qty} unités effectué ✓`);
  }

  function doApprov(){
    if(!ap.produitId)return T("Choisissez un produit",true);
    const qty=Number(ap.qty);
    if(!qty||qty<=0)return T("Quantité invalide",true);
    const pid=Number(ap.produitId);
    // Add to stock
    const curStock=((mag&&mag.stock)||{})[pid]||0;
    const newStock={...((mag&&mag.stock)||{}),[pid]:curStock+qty};
    const pNom=produits.find(x=>x.id===pid)?.nom||"?";
    const entry={id:Date.now(),date:ap.date,magasinId:sel,magasinNom:mag.nom,produitId:pid,produitNom:pNom,qty,type:ap.type};
    setDb(p=>({...p,
      magasins:p.magasins.map(m=>m.id===sel?{...m,stock:newStock}:m),
      approvHist:[...(p.approvHist||[]),entry]
    }));
    setAp({produitId:"",qty:"",type:"TRUCK",date:new Date().toISOString().slice(0,10)});
    setShowApprov(false);T(`Approvisionnement +${qty} enregistré ✓`);
  }

  const magProds=mag?produits.filter(p=>(p.magasins||[]).includes(mag.id)):[];
  function stInfo(m){
    return produits.filter(p=>(p.magasins||[]).includes(m.id)).map(p=>{
      const ini=((m.stock)||{})[p.id]||0;
      const sold=commandes.filter(c=>c.magasinId===m.id).flatMap(c=>c.lignes).filter(l=>l.produitId===p.id).reduce((s,l)=>s+(l.qty||0),0);
      const sortant=transferts.filter(t=>t.deId===m.id&&t.produitId===p.id).reduce((s,t)=>s+(t.qty||0),0);
      const entrant=transferts.filter(t=>t.versId===m.id&&t.produitId===p.id).reduce((s,t)=>s+(t.qty||0),0);
      return{...p,ini,sold,sortant,entrant,av:ini-sold-sortant+entrant};
    }).filter(p=>p.ini>0||p.sold>0||p.entrant>0);
  }
  const magCmds=mag?commandes.filter(c=>c.magasinId===mag.id):[];
  const magTotal=magCmds.reduce((s,c)=>s+tCmd(c),0);
  const magTr=mag?transferts.filter(t=>t.deId===mag.id||t.versId===mag.id):[];
  const magApprovHist=mag?approvHist.filter(a=>a.magasinId===mag.id):[];
  const magStockLogs=mag?stockLogs.filter(l=>l.magasinId===mag.id):[];

  return h('div',{className:"fu",style:{display:"flex",gap:"20px",alignItems:"flex-start"}},
    // Sidebar liste magasins
    h('div',{style:{width:"205px",flexShrink:0}},
      h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px"}},"Magasins"),
        h('button',{onClick:()=>setAddF(v=>!v),style:btn(G.ac,"#fff",{padding:"5px 11px",fontSize:"12px"})}," + ")
      ),
      addF?h('div',{className:"fu",style:{...card({padding:"10px 11px",marginBottom:"9px"}),border:`1px solid ${G.ac}`}},
        h(Inp,{value:nom,onChange:e=>setNom(e.target.value),placeholder:"Nom du magasin",style:{marginBottom:"7px"}}),
        h('div',{style:{display:"flex",gap:"6px"}},
          h('button',{onClick:add,style:{...btn(G.ac,"#fff",{flex:1,padding:"5px",fontSize:"12px"})}},"Créer"),
          h('button',{onClick:()=>setAddF(false),style:btn("none",G.mut,{border:`1px solid ${G.b1}`,padding:"5px 8px",fontSize:"12px"})},"✕")
        )
      ):null,
      magasins.length===0?h(EmptyState,{icon:"🏪",msg:"Aucun magasin"}):
      h('div',{style:{display:"flex",flexDirection:"column",gap:"4px"}},
        ...magasins.map(m=>{
          const isSel=sel===m.id;
          const nc=commandes.filter(c=>c.magasinId===m.id).length;
          return h('div',{key:m.id,style:{borderRadius:"8px",background:isSel?G.acBg:G.card,border:isSel?`1px solid ${G.acBd}`:`1px solid ${G.b1}`,overflow:"hidden"}},
            h('button',{onClick:()=>{setSel(m.id);setEditSt(false);setShowTransfert(false);setShowApprov(false);setShowHistApprov(false);},style:{width:"100%",textAlign:"left",padding:"9px 11px",background:"none",border:"none",cursor:"pointer",color:isSel?G.acL:"#888"}},
              h('div',{style:{fontWeight:600,fontSize:"13px",marginBottom:"2px"}},"🏪 "+m.nom),
              h('div',{style:{fontSize:"10px",color:isSel?G.ac:G.mut}},nc+" cmd(s)")
            ),
            isSel?h('div',{style:{padding:"0 9px 8px",display:"flex",gap:"4px",flexWrap:"wrap"}},
              h('button',{onClick:startE,style:{flex:1,background:"#2a2a3a",color:G.dim,border:"none",cursor:"pointer",padding:"4px",borderRadius:"5px",fontSize:"10px"}},"✏ Stock"),
              h('button',{onClick:()=>{setShowApprov(v=>!v);setShowTransfert(false);},style:{flex:1,background:G.gr+"22",color:G.gr,border:`1px solid ${G.gr}33`,cursor:"pointer",padding:"4px",borderRadius:"5px",fontSize:"10px"}},"📦 Approv"),
              h('button',{onClick:()=>setShowTransfert(v=>!v),style:{flex:1,background:G.ac+"22",color:G.acL,border:`1px solid ${G.acBd}`,cursor:"pointer",padding:"4px",borderRadius:"5px",fontSize:"10px"}},"↔ Transfert"),
              h('button',{onClick:()=>{if(!confirm("Supprimer ce magasin ?"))return;del(m.id);},style:{background:G.re+"15",color:G.re,border:`1px solid ${G.re}30`,padding:"4px 7px",borderRadius:"5px",fontSize:"10px",cursor:"pointer"}},"✕")
            ):null
          );
        })
      )
    ),

    // Détail magasin
    mag?h('div',{style:{flex:1,minWidth:0}},

      // Summary card
      h('div',{style:card({padding:"14px 16px",marginBottom:"12px"})},
        h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}},
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"17px"}},"🏪 "+mag.nom),
          h('button',{onClick:startE,style:btn(G.ac,"#fff",{padding:"5px 12px",fontSize:"12px"})},"✏ Modifier stock")
        ),
        h('div',{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"7px"}},
          ...[["Produits",magProds.length],["Commandes",magCmds.length],["Approv.",magApprovHist.length],["Clients",new Set(magCmds.map(c=>c.clientId)).size]].map(([l,v])=>
            h('div',{key:l,style:{background:G.d2,borderRadius:"7px",padding:"8px 11px"}},
              h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",marginBottom:"2px"}},l),
              h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"15px"}},v)
            )
          )
        )
      ),

      // Approv form
      showApprov?h('div',{className:"fu",style:{...card({padding:"14px 16px",marginBottom:"12px"}),border:`1px solid ${G.gr}55`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.gr,marginBottom:"12px"}},"📦 Nouvel approvisionnement — "+mag.nom),
        h('div',{style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"9px",marginBottom:"10px"}},
          h(Lbl,{label:"Produit"},
            h(Sel,{value:ap.produitId,onChange:e=>setAp(x=>({...x,produitId:e.target.value}))},
              h('option',{value:""},"— Choisir —"),
              ...magProds.map(p=>h('option',{key:p.id,value:p.id},p.nom))
            )
          ),
          h(Lbl,{label:"Quantité"},h(Inp,{type:"number",value:ap.qty,onChange:e=>setAp(x=>({...x,qty:e.target.value})),placeholder:"0"})),
          h(Lbl,{label:"Type"},
            h(Sel,{value:ap.type,onChange:e=>setAp(x=>({...x,type:e.target.value}))},
              h('option',{value:"TRUCK"},"🚛 TRUCK"),
              h('option',{value:"CONTAINER"},"📦 CONTAINER")
            )
          ),
          h(Lbl,{label:"Date"},h(Inp,{type:"date",value:ap.date,onChange:e=>setAp(x=>({...x,date:e.target.value}))}))
        ),
        h('div',{style:{display:"flex",gap:"8px"}},
          h('button',{onClick:doApprov,style:btn(G.gr,"#fff")},"✓ Enregistrer"),
          h('button',{onClick:()=>setShowApprov(false),style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"Annuler")
        )
      ):null,

      // Transfert form
      showTransfert?h('div',{className:"fu",style:{...card({padding:"14px 16px",marginBottom:"12px"}),border:`1px solid ${G.acBd}`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.acL,marginBottom:"12px"}},"↔ Transfert de stock — "+mag.nom),
        h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"9px",marginBottom:"10px"}},
          h(Lbl,{label:"Produit"},
            h(Sel,{value:tr.produitId,onChange:e=>setTr(x=>({...x,produitId:e.target.value}))},
              h('option',{value:""},"— Choisir —"),
              ...magProds.map(p=>h('option',{key:p.id,value:p.id},p.nom+" (dispo: "+stockDispo(mag,p.id,commandes,transferts)+")"))
            )
          ),
          h(Lbl,{label:"Vers magasin"},
            h(Sel,{value:tr.versId,onChange:e=>setTr(x=>({...x,versId:e.target.value}))},
              h('option',{value:""},"— Choisir —"),
              ...magasins.filter(m=>m.id!==sel).map(m=>h('option',{key:m.id,value:m.id},m.nom))
            )
          ),
          h(Lbl,{label:"Quantité"},h(Inp,{type:"number",value:tr.qty,onChange:e=>setTr(x=>({...x,qty:e.target.value})),placeholder:"0"})),
          h(Lbl,{label:"Date"},h(Inp,{type:"date",value:tr.date,onChange:e=>setTr(x=>({...x,date:e.target.value}))}))
        ),
        h('div',{style:{display:"flex",gap:"8px"}},
          h('button',{onClick:doTransfert,style:btn(G.ac,"#fff")},"✓ Transférer"),
          h('button',{onClick:()=>setShowTransfert(false),style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"Annuler")
        )
      ):null,

      // Stock edit form
      editSt?h('div',{className:"fu",style:{...card({padding:"14px 16px",marginBottom:"12px"}),border:`1px solid ${G.ac}`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.acL,marginBottom:"3px"}},"Stock initial — "+mag.nom),
        h('div',{style:{color:G.mut,fontSize:"11px",marginBottom:"12px"}},"Modifiez les quantités — un log sera créé automatiquement"),
        magProds.length===0?h('div',{style:{color:G.mut,fontSize:"12px"}},"Aucun produit dans ce magasin."):
        h('div',{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:"7px",marginBottom:"12px"}},
          ...magProds.map(p=>{
            const sold=commandes.filter(c=>c.magasinId===mag.id).flatMap(c=>c.lignes).filter(l=>l.produitId===p.id).reduce((s,l)=>s+(l.qty||0),0);
            return h('div',{key:p.id,style:{background:G.d2,borderRadius:"7px",padding:"9px 11px"}},
              h('div',{style:{fontSize:"11px",color:G.dim,marginBottom:"3px",fontWeight:500}},p.nom),
              sold>0?h('div',{style:{fontSize:"10px",color:G.am,marginBottom:"3px"}},"Vendu: "+sold):null,
              h(Inp,{type:"number",value:st[p.id]||"",onChange:e=>setSt(s=>({...s,[p.id]:e.target.value})),placeholder:"Qté"})
            );
          })
        ),
        h('div',{style:{display:"flex",gap:"9px"}},
          h('button',{onClick:saveS,style:btn(G.ac,"#fff")},"💾 Enregistrer"),
          h('button',{onClick:()=>setEditSt(false),style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"Annuler")
        )
      ):
      // Stock table
      h('div',{style:card({overflow:"hidden",marginBottom:"12px"})},
        h('div',{style:{padding:"9px 13px",borderBottom:`1px solid ${G.b2}`,display:"flex",justifyContent:"space-between",alignItems:"center"}},
          h('div',{style:{fontSize:"10px",color:G.acL,textTransform:"uppercase",fontWeight:600}},"📊 Stock actuel"),
          h('div',{style:{display:"flex",gap:"8px",alignItems:"center"}},
            h('div',{style:{fontSize:"10px",color:G.mut}},"Initial − Vendu − Sortant + Entrant = Disponible"),
            h(PrintBtn,{label:"Imprimer",onClick:()=>{
              const rows=stInfo(mag).map(p=>`<tr><td>${p.nom}</td><td style="text-align:center">${p.ini}</td><td style="text-align:center;color:#e67">${p.sold>0?"-"+p.sold:"0"}</td><td style="text-align:center">${p.sortant>0?"↑ "+p.sortant:""}${p.entrant>0?" ↓ "+p.entrant:""}</td><td style="text-align:center;font-weight:700;color:${p.av<=0?"#c00":p.av/p.ini<0.25?"#e67":"#090"}">${p.av}</td></tr>`).join("");
              printSection(`Stock — ${mag.nom}`,`<h2>Stock actuel — ${mag.nom}</h2><table><thead><tr><th>Produit</th><th>Initial</th><th>Vendu</th><th>Transferts</th><th>Disponible</th></tr></thead><tbody>${rows}</tbody></table>`);
            }})
          )
        ),
        stInfo(mag).length===0?h('div',{style:{padding:"25px",textAlign:"center",color:"#333",fontSize:"12px"}},"Aucun stock."):
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["Produit","Initial","Vendu","Transferts","Disponible"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...stInfo(mag).map((p,i)=>{
              const pct=p.ini>0?(p.av/p.ini)*100:0;
              const col=p.av<=0?G.re:pct<25?G.am:G.gr;
              return h('tr',{key:p.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                h('td',{style:tbd({fontWeight:500})},p.nom),
                h('td',{style:tbd({color:G.mut})},p.ini),
                h('td',{style:tbd({color:G.am})},p.sold>0?"-"+p.sold:"0"),
                h('td',{style:tbd({fontSize:"11px"})},
                  p.sortant>0?h('span',{style:{color:G.re,marginRight:"6px"}},"↑ "+p.sortant):null,
                  p.entrant>0?h('span',{style:{color:G.gr}},"↓ "+p.entrant):null,
                  !p.sortant&&!p.entrant?h('span',{style:{color:"#333"}},"—"):null
                ),
                h('td',{style:tbd()},
                  h('div',{style:{display:"flex",alignItems:"center",gap:"8px"}},
                    h('span',{style:{fontWeight:700,fontSize:"13px",color:col}},p.av),
                    h('div',{style:{flex:1,height:"4px",background:G.b2,borderRadius:"2px",maxWidth:"60px"}},
                      h('div',{style:{height:"100%",width:`${Math.max(0,Math.min(100,pct))}%`,background:col,borderRadius:"2px"}})
                    )
                  )
                )
              );
            })
          )
        )
      ),

      // Historique approvisionnements
      h('div',{style:{marginBottom:"12px"}},
        h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"7px"}},
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px"}},"📦 Approvisionnements ("+magApprovHist.length+")"),
          h('div',{style:{display:"flex",gap:"6px"}},
            magApprovHist.length>0?h(PrintBtn,{label:"Imprimer",onClick:()=>{
              const rows=[...magApprovHist].sort((a,b)=>b.date.localeCompare(a.date)).map(a=>`<tr><td>${fmtDate(a.date)}</td><td>${a.produitNom}</td><td style="text-align:center;color:#090;font-weight:700">+ ${a.qty}</td><td>${a.type}</td></tr>`).join("");
              const total=[...magApprovHist].reduce((s,a)=>s+a.qty,0);
              printSection(`Approvisionnements — ${mag.nom}`,`<h2>Historique approvisionnements — ${mag.nom}</h2><table><thead><tr><th>Date</th><th>Produit</th><th>Quantité</th><th>Type</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2" style="text-align:right;font-weight:700">Total reçu</td><td style="font-weight:700;color:#090">+ ${total}</td><td></td></tr></tfoot></table>`);
            }}):null,
            h('button',{onClick:()=>setShowHistApprov(v=>!v),style:{fontSize:"11px",color:G.acL,background:G.acBg,border:`1px solid ${G.acBd}`,padding:"3px 10px",borderRadius:"5px",cursor:"pointer"}},showHistApprov?"▲ Masquer":"▼ Voir")
          )
        ),
        showHistApprov?h('div',{style:card({overflow:"hidden",marginBottom:"8px"})},
          magApprovHist.length===0?h('div',{style:{padding:"20px",textAlign:"center",color:"#333",fontSize:"12px"}},"Aucun approvisionnement enregistré"):
          h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
            h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
              ["Date","Produit","Quantité","Type",""].map(x=>h('th',{key:x,style:tbh},x))
            )),
            h('tbody',null,
              ...[...magApprovHist].sort((a,b)=>b.date.localeCompare(a.date)).map((a,i)=>
                h('tr',{key:a.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                  h('td',{style:tbd({whiteSpace:"nowrap"})},h(EditableDate,{value:a.date,onChange:v=>setDb(p=>({...p,approvHist:(p.approvHist||[]).map(x=>x.id===a.id?{...x,date:v}:x)}))})),
                  h('td',{style:tbd({fontWeight:500})},a.produitNom),
                  h('td',{style:tbd({color:G.gr,fontWeight:700})},"+ "+a.qty),
                  h('td',{style:tbd()},h(Tag,{label:(a.type==="TRUCK"?"🚛 ":"📦 ")+a.type,color:a.type==="TRUCK"?G.am:G.ac})),
                  h('td',{style:tbd()},
                    h('button',{onClick:()=>{
                      if(!confirm("Supprimer cet approvisionnement ? Le stock sera réduit."))return;
                      // Reverse the stock addition
                      const pid=a.produitId;
                      const curSt=((mag&&mag.stock)||{})[pid]||0;
                      const newSt=Math.max(0,curSt-a.qty);
                      const newStock={...((mag&&mag.stock)||{}),[pid]:newSt};
                      setDb(p=>({...p,
                        magasins:p.magasins.map(m=>m.id===sel?{...m,stock:newStock}:m),
                        approvHist:(p.approvHist||[]).filter(x=>x.id!==a.id)
                      }));
                      T("Approvisionnement supprimé ✓");
                    },style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
                  )
                )
              )
            )
          )
        ):null
      ),

      // Logs de modification manuelle du stock
      magStockLogs.length>0?h('div',{style:{marginBottom:"12px"}},
        h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"7px"}},
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px"}},"📋 Modifications manuelles ("+magStockLogs.length+")"),
          h(PrintBtn,{label:"Imprimer",onClick:()=>{
            const rows=[...magStockLogs].sort((a,b)=>b.date.localeCompare(a.date)).flatMap(log=>log.changes.map(ch=>{const diff=ch.apres-ch.avant;return `<tr><td>${fmtDate(log.date)}</td><td>${ch.produitNom}</td><td style="text-align:center;font-weight:700;color:${diff<0?"#c00":"#090"}">${diff>0?"+":""}${diff}</td><td>${log.note||""}</td></tr>`;})).join("");
            printSection(`Modifications stock — ${mag.nom}`,`<h2>Modifications manuelles — ${mag.nom}</h2><table><thead><tr><th>Date</th><th>Produit</th><th>Variation</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>`);
          }})
        ),
        h('div',{style:card({overflow:"hidden"})},
          h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
            h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
              ["Date","Produit","Qté","Note",""].map(x=>h('th',{key:x,style:tbh},x))
            )),
            h('tbody',null,
              ...[...magStockLogs].sort((a,b)=>b.date.localeCompare(a.date)).flatMap((log,li)=>
                log.changes.map((ch,ci)=>{
                  const diff=ch.apres-ch.avant;
                  const noteId=log.id+"-note";
                  return h('tr',{key:log.id+"-"+ci,className:"trh",style:{borderBottom:"1px solid #141420",background:li%2===0?"transparent":"rgba(255,255,255,.01)"}},
                    h('td',{style:tbd({whiteSpace:"nowrap"})},ci===0?h(EditableDate,{value:log.date,onChange:v=>setDb(p=>({...p,stockLogs:(p.stockLogs||[]).map(x=>x.id===log.id?{...x,date:v}:x)}))}):null),
                    h('td',{style:tbd({fontWeight:500})},ch.produitNom),
                    h('td',{style:tbd({fontWeight:700,color:diff<0?G.re:diff>0?G.gr:G.mut})},
                      (diff>0?"+":"")+diff
                    ),
                    h('td',{style:tbd()},ci===0?(
                      editNote===noteId
                        ?h('div',{style:{display:"flex",gap:"5px",alignItems:"center"}},
                            h('input',{autoFocus:true,value:noteVal,onChange:e=>setNoteVal(e.target.value),
                              onBlur:()=>{setDb(p=>({...p,stockLogs:(p.stockLogs||[]).map(x=>x.id===log.id?{...x,note:noteVal}:x)}));setEditNote(null);},
                              onKeyDown:e=>{
                                if(e.key==="Enter"){setDb(p=>({...p,stockLogs:(p.stockLogs||[]).map(x=>x.id===log.id?{...x,note:noteVal}:x)}));setEditNote(null);}
                                if(e.key==="Escape")setEditNote(null);
                              },
                              style:{background:"#1a1a26",border:"1px solid #5b5bf6",color:"#e2e0db",padding:"3px 7px",borderRadius:"5px",fontSize:"11px",fontFamily:"inherit",width:"150px",outline:"none"}
                            })
                          )
                        :h('span',{
                            onDoubleClick:()=>{setNoteVal(log.note||"");setEditNote(noteId);},
                            title:"Double-clic pour modifier",
                            style:{cursor:"text",color:log.note&&log.note!=="Modifié manuellement"?G.txt:G.mut,fontSize:"11px",display:"inline-block",minWidth:"80px",padding:"2px 4px",borderRadius:"4px",border:"1px solid transparent"}
                          },log.note||"Double-clic pour écrire...")
                    ):null),
                    h('td',{style:tbd()},ci===0?h('button',{onClick:()=>setDb(p=>({...p,stockLogs:(p.stockLogs||[]).filter(x=>x.id!==log.id)})),style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕"):null)
                  );
                })
              )
            )
          )
        )
      ):null,

      // Historique transferts
      magTr.length>0?h('div',{style:{marginBottom:"12px"}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",marginBottom:"7px"}},"↔ Transferts ("+magTr.length+")"),
        h('div',{style:card({overflow:"hidden"})},
          h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
            h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
              ["Date","Produit","Qté","Direction",""].map(x=>h('th',{key:x,style:tbh},x))
            )),
            h('tbody',null,
              ...magTr.sort((a,b)=>b.date.localeCompare(a.date)).map((t,i)=>{
                const sortant=t.deId===mag.id;
                return h('tr',{key:t.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                  h('td',{style:tbd()},h(EditableDate,{value:t.date,onChange:v=>setDb(p=>({...p,transferts:(p.transferts||[]).map(x=>x.id===t.id?{...x,date:v}:x)}))})),
                  h('td',{style:tbd({fontWeight:500})},pN(produits,t.produitId)),
                  h('td',{style:tbd({color:sortant?G.re:G.gr,fontWeight:700})},(sortant?"-":"+")+t.qty),
                  h('td',{style:tbd({fontSize:"11px"})},
                    sortant?h('span',{style:{color:G.re}},"↑ vers "+mN(magasins,t.versId)):h('span',{style:{color:G.gr}},"↓ de "+mN(magasins,t.deId))
                  ),
                  h('td',{style:tbd()},
                    h('button',{onClick:()=>{if(!confirm("Supprimer ce transfert ?"))return;setDb(p=>({...p,transferts:(p.transferts||[]).filter(x=>x.id!==t.id)}));T("Transfert supprimé ✓");},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
                  )
                );
              })
            )
          )
        )
      ):null,

      h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",marginBottom:"7px"}},`Commandes (${magCmds.length})`),
      h('div',{style:card({overflow:"hidden"})},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["#","Date","Client","Produits","Montant"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            magCmds.length===0?h('tr',null,h('td',{colSpan:5,style:{padding:"20px",textAlign:"center",color:"#333"}},"Aucune commande")):
            magCmds.sort((a,b)=>b.date.localeCompare(a.date)).map((c,i)=>h('tr',{key:c.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
              h('td',{style:tbd({color:G.dim})},"#"+c.id),
              h('td',{style:tbd({whiteSpace:"nowrap"})},h(EditableDate,{value:c.date,onChange:v=>setDb(p=>({...p,commandes:p.commandes.map(x=>x.id===c.id?{...x,date:v}:x)}))})),
              h('td',{style:tbd({fontWeight:500})},cN(clients,c.clientId)),
              h('td',{style:tbd()},
                ...c.lignes.slice(0,2).map((l,j)=>h('span',{key:j,style:{fontSize:"10px",color:G.dim,background:G.d2,padding:"2px 5px",borderRadius:"3px",marginRight:"3px"}},pN(produits,l.produitId)+" ×"+l.qty)),
                c.lignes.length>2?h('span',{style:{fontSize:"10px",color:G.mut}},`+${c.lignes.length-2}`):null
              ),
              h('td',{style:tbd({color:tCmd(c)>0?G.te:"#333",fontWeight:tCmd(c)>0?600:400})},tCmd(c)>0?tCmd(c).toLocaleString()+" GMD":"—")
            )),
            h(TotalRow,{cols:5,label:`${magCmds.length} commande(s)`,amount:magTotal})
          )
        )
      )
    ):null
  );
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────
function Clis({db,setDb,T}){
  const {clients,commandes,produits,magasins}=db;
  const [search,setSearch]=useState("");
  const [form,setForm]=useState(false);
  const [nom,setNom]=useState("");
  const [det,setDet]=useState(null);
  const [ed,setEd]=useState(null);
  const [ev,setEv]=useState("");
  const [editPaie,setEditPaie]=useState(false);
  const [newPaie,setNewPaie]=useState({});
  const [editNom,setEditNom]=useState(false);
  const [newNom,setNewNom]=useState("");

  function add(){if(!nom.trim())return T("Nom requis",true);const id=gid(clients);setDb(p=>({...p,clients:[...p.clients,{id,nom:nom.trim().toUpperCase(),paiements:[]}]}));setNom("");setForm(false);T("Client ajouté !");}
  function del(id){if(commandes.some(c=>c.clientId===id))return T("Ce client a des commandes",true);setDb(p=>({...p,clients:p.clients.filter(c=>c.id!==id)}));T("Supprimé");}
  function commit(id){setDb(p=>({...p,clients:p.clients.map(c=>c.id===id?{...c,nom:ev.trim().toUpperCase()}:c)}));setEd(null);}

  const stats=clients.map(cl=>{
    const nc=commandes.filter(o=>o.clientId===cl.id).length;
    const tot=commandes.filter(o=>o.clientId===cl.id).reduce((s,o)=>s+tCmd(o),0);
    const paie=(cl.paiements||[]).reduce((s,p)=>s+(p.montant||0),0);
    const dette=tot-paie;
    return{...cl,nc,tot,paie,dette};
  }).filter(c=>!search||c.nom.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.nom.localeCompare(b.nom));

  const grandDette=stats.reduce((s,c)=>s+Math.max(0,c.dette),0);

  if(det!==null){
    const cl=clients.find(c=>c.id===det);
    if(!cl){setDet(null);return null;}
    const cmds=commandes.filter(o=>o.clientId===det).sort((a,b)=>b.date.localeCompare(a.date));
    const totalCmds=cmds.reduce((s,c)=>s+tCmd(c),0);
    const paiements=(cl.paiements||[]).sort((a,b)=>b.date.localeCompare(a.date));
    const totalPaie=paiements.reduce((s,p)=>s+(p.montant||0),0);
    const dette=totalCmds-totalPaie;

    return h('div',{className:"fu"},
      h('button',{onClick:()=>{setDet(null);setEditPaie(false);setEditNom(false);},style:{color:G.acL,background:"none",border:"none",cursor:"pointer",fontSize:"13px",marginBottom:"16px"}},"← Retour"),
      h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}},
        h('div',null,
          editNom
            ?h('div',{style:{display:"flex",gap:"7px",alignItems:"center",marginBottom:"4px"}},
                h('input',{autoFocus:true,value:newNom,onChange:e=>setNewNom(e.target.value),
                  onKeyDown:e=>{
                    if(e.key==="Enter"){
                      if(newNom.trim()){setDb(p=>({...p,clients:p.clients.map(c=>c.id===det?{...c,nom:newNom.trim().toUpperCase()}:c)}));T("Nom modifié ✓");}
                      setEditNom(false);
                    }
                    if(e.key==="Escape")setEditNom(false);
                  },
                  style:{background:"#1a1a26",border:"1px solid #5b5bf6",color:"#e2e0db",padding:"6px 10px",borderRadius:"6px",fontSize:"18px",fontFamily:"Syne,sans-serif",fontWeight:800,width:"240px",outline:"none"}
                }),
                h('button',{onClick:()=>{
                  if(newNom.trim()){setDb(p=>({...p,clients:p.clients.map(c=>c.id===det?{...c,nom:newNom.trim().toUpperCase()}:c)}));T("Nom modifié ✓");}
                  setEditNom(false);
                },style:{cursor:"pointer",background:"#5b5bf6",color:"#fff",border:"none",padding:"6px 14px",borderRadius:"6px",fontSize:"13px",fontFamily:"inherit"}},"✓"),
                h('button',{onClick:()=>setEditNom(false),style:{cursor:"pointer",background:"none",color:"#888",border:"1px solid #1e1e2e",padding:"6px 10px",borderRadius:"6px",fontSize:"13px",fontFamily:"inherit"}},"✕")
              )
            :h('div',{style:{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}},
                h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"22px"}},cl.nom),
                h('button',{onClick:()=>{setNewNom(cl.nom);setEditNom(true);},style:{cursor:"pointer",background:"#2a2a3a",color:"#888",border:"none",padding:"4px 10px",borderRadius:"5px",fontSize:"12px",fontFamily:"inherit"}},"✏ Modifier")
              ),
          h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"2px"}},`${cmds.length} commande(s) · ${paiements.length} paiement(s)`)
        ),
        h('div',{style:{display:"flex",gap:"8px"}},
          h(PrintBtn,{onClick:()=>{
            const cmdRows=cmds.map(c=>`<tr><td>#${c.id}</td><td>${fmtDate(c.date)}</td><td>${mN(magasins,c.magasinId)||"—"}</td><td style="text-align:right">${tCmd(c)>0?tCmd(c).toLocaleString()+" GMD":"—"}</td></tr>`).join("");
            const paieRows=paiements.map(p=>`<tr><td>${fmtDate(p.date)}</td><td style="text-align:right;color:#090">${p.montant.toLocaleString()} GMD</td><td>${p.type||"cash"}</td></tr>`).join("");
            const detteColor=dette>0?"#c00":dette<0?"#090":"#999";
            printSection(`Profil — ${cl.nom}`,`
              <h2>${cl.nom}</h2>
              <table style="width:auto;margin-bottom:14px">
                <tr><th>Total commandes</th><td style="text-align:right">${totalCmds.toLocaleString()} GMD</td></tr>
                <tr><th>Total payé</th><td style="text-align:right">${totalPaie.toLocaleString()} GMD</td></tr>
                <tr><th>Dette</th><td style="text-align:right;color:${detteColor};font-weight:700">${dette===0?"✓ Soldé":dette.toLocaleString()+" GMD"}</td></tr>
              </table>
              <h2>Commandes (${cmds.length})</h2>
              <table><thead><tr><th>#</th><th>Date</th><th>Magasin</th><th>Montant</th></tr></thead><tbody>${cmdRows}</tbody></table>
              <h2 style="margin-top:14px">Paiements (${paiements.length})</h2>
              <table><thead><tr><th>Date</th><th>Montant</th><th>Type</th></tr></thead><tbody>${paieRows}</tbody></table>`);
          }}),
          h('button',{onClick:()=>setEditPaie(v=>!v),style:btn(G.gr,"#fff",{fontSize:"13px"})},"+ Ajouter un paiement")
        )
      ),

      // Formulaire paiement
      editPaie?h('div',{className:"fu",style:{...card({padding:"14px 16px",marginBottom:"16px"}),border:`1px solid ${G.gr}`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.gr,marginBottom:"12px"}},"💳 Nouveau paiement"),
        h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"9px",marginBottom:"10px"}},
          h(Lbl,{label:"Date"},h(Inp,{type:"date",value:newPaie.date||new Date().toISOString().slice(0,10),onChange:e=>setNewPaie(s=>({...s,date:e.target.value}))})),
          h(Lbl,{label:"Montant (GMD)"},h(Inp,{type:"number",placeholder:"0",value:newPaie.montant||"",onChange:e=>setNewPaie(s=>({...s,montant:e.target.value}))})),
          h(Lbl,{label:"Type"},h(Sel,{value:newPaie.type||"cash",onChange:e=>setNewPaie(s=>({...s,type:e.target.value}))},
            h('option',{value:"cash"},"💵 Cash"),
            h('option',{value:"virement"},"🏦 Virement"),
            h('option',{value:"cheque"},"📄 Chèque"),
            h('option',{value:"mobile"},"📱 Mobile Money"),
            h('option',{value:"autre"},"🔄 Autre")
          ))
        ),
        h('div',{style:{display:"flex",gap:"8px"}},
          h('button',{onClick:()=>{
            const m=Number(newPaie.montant);
            if(!m||m<=0)return T("Montant invalide",true);
            const paie={id:Date.now(),date:newPaie.date||new Date().toISOString().slice(0,10),montant:m,type:newPaie.type||"cash"};
            setDb(p=>({...p,clients:p.clients.map(c=>c.id===det?{...c,paiements:[...(c.paiements||[]),paie]}:c)}));
            setNewPaie({});setEditPaie(false);T("Paiement ajouté !");
          },style:btn(G.gr,"#fff")},"✓ Enregistrer"),
          h('button',{onClick:()=>{setEditPaie(false);setNewPaie({});},style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"Annuler")
        )
      ):null,

      // Cartes résumé dette
      h('div',{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"18px"}},
        h('div',{style:card({padding:"14px 16px"})},
          h('div',{style:{fontSize:"10px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}},"Total commandes"),
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:G.te}},totalCmds>0?totalCmds.toLocaleString()+" GMD":"—")
        ),
        h('div',{style:card({padding:"14px 16px"})},
          h('div',{style:{fontSize:"10px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}},"Total payé"),
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:G.gr}},totalPaie>0?totalPaie.toLocaleString()+" GMD":"—")
        ),
        h('div',{style:{...card({padding:"14px 16px"}),border:`1px solid ${dette>0?G.re+"55":dette<0?G.gr+"55":G.b1}`}},
          h('div',{style:{fontSize:"10px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}},"💸 Dette"),
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:dette>0?G.re:dette<0?G.gr:G.dim}},
            dette===0?"✓ Soldé":dette.toLocaleString()+" GMD"
          ),
          null
        )
      ),

      // Commandes
      h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.txt,marginBottom:"8px"}},"🧾 Commandes"),
      h('div',{style:{...card({overflow:"hidden"}),marginBottom:"16px"}},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["#","Date","Magasin","Produits","Montant"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            cmds.length===0?h('tr',null,h('td',{colSpan:5,style:{padding:"20px",textAlign:"center",color:"#333",fontSize:"12px"}},"Aucune commande")):
            cmds.map((c,i)=>h('tr',{key:c.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
              h('td',{style:tbd({color:G.dim,fontWeight:600})},"#"+c.id),
              h('td',{style:tbd({whiteSpace:"nowrap"})},h(EditableDate,{value:c.date,onChange:v=>setDb(p=>({...p,commandes:p.commandes.map(x=>x.id===c.id?{...x,date:v}:x)}))})),
              h('td',{style:tbd()},h(Tag,{label:"🏪 "+mN(magasins,c.magasinId)})),
              h('td',{style:tbd()},
                ...c.lignes.slice(0,2).map((l,j)=>h('span',{key:j,style:{fontSize:"10px",color:G.dim,background:G.d2,padding:"2px 5px",borderRadius:"3px",marginRight:"3px"}},pN(produits,l.produitId)+" ×"+l.qty)),
                c.lignes.length>2?h('span',{style:{fontSize:"10px",color:G.mut}},`+${c.lignes.length-2}`):null
              ),
              h('td',{style:tbd({color:tCmd(c)>0?G.te:"#333",fontWeight:700})},tCmd(c)>0?tCmd(c).toLocaleString()+" GMD":"—")
            )),
            h(TotalRow,{cols:5,label:`${cmds.length} commande(s)`,amount:totalCmds})
          )
        )
      ),

      // Paiements
      h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.txt,marginBottom:"8px"}},"💳 Paiements reçus"),
      h('div',{style:card({overflow:"hidden"})},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["Date","Montant","Type",""].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            paiements.length===0?h('tr',null,h('td',{colSpan:4,style:{padding:"20px",textAlign:"center",color:"#333",fontSize:"12px"}},"Aucun paiement")):
            paiements.map((p,i)=>{
              const icons={"cash":"💵 Cash","virement":"🏦 Virement","cheque":"📄 Chèque","mobile":"📱 Mobile","autre":"🔄 Autre"};
              return h('tr',{key:p.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                h('td',{style:tbd({whiteSpace:"nowrap"})},h(EditableDate,{value:p.date,onChange:v=>setDb(p2=>({...p2,clients:p2.clients.map(c=>c.id===det?{...c,paiements:(c.paiements||[]).map(x=>x.id===p.id?{...x,date:v}:x)}:c)}))})),
                h('td',{style:tbd({color:G.gr,fontWeight:700})},p.montant.toLocaleString()+" GMD"),
                h('td',{style:tbd()},h(Tag,{label:icons[p.type]||p.type,color:G.gr})),
                h('td',{style:tbd()},h('button',{onClick:()=>{if(!confirm("Supprimer ce paiement ?"))return;setDb(prev=>({...prev,clients:prev.clients.map(c=>c.id===det?{...c,paiements:(c.paiements||[]).filter(x=>x.id!==p.id)}:c)}));T("Paiement supprimé");},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕"))
              );
            }),
            paiements.length>0?h('tr',{style:{borderTop:`2px solid ${G.b1}`,background:G.d2}},
              h('td',{style:{padding:"9px 12px",fontSize:"11px",color:G.mut}},`${paiements.length} paiement(s)`),
              h('td',{style:{padding:"9px 12px",color:G.gr,fontWeight:700}},totalPaie.toLocaleString()+" GMD"),
              h('td',null),h('td',null)
            ):null
          )
        )
      )
    );
  }

  return h('div',{className:"fu"},
    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"9px"}},
      h('div',null,
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},"Clients"),
        h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"2px"}},`${clients.length} client(s)`)
      ),
      h('div',{style:{display:"flex",gap:"8px"}},
        h(PrintBtn,{label:"Imprimer liste",onClick:()=>{
          const rows=stats.map(c=>`<tr><td>${c.nom}</td><td style="text-align:center">${c.nc}</td><td style="text-align:right">${c.tot>0?c.tot.toLocaleString()+" GMD":"—"}</td><td style="text-align:right;color:${c.dette>0?"#c00":c.dette<0?"#090":"#999"};font-weight:${c.dette!==0?700:400}">${c.dette===0?"✓ Soldé":c.dette.toLocaleString()+" GMD"}</td></tr>`).join("");
          const totalDette=stats.reduce((s,c)=>s+Math.max(0,c.dette),0);
          printSection("Liste des clients",`<h2>Clients (${stats.length})</h2><table><thead><tr><th>Nom</th><th>Commandes</th><th>Total achats</th><th>Dette</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">Total dettes</td><td style="font-weight:700;color:#c00">${totalDette>0?totalDette.toLocaleString()+" GMD":"✓ 0"}</td></tr></tfoot></table>`);
        }}),
        h('button',{onClick:()=>setForm(v=>!v),style:btn(G.ac,"#fff")},"+ Ajouter")
      )
    ),
    form?h('div',{className:"fu",style:{...card({padding:"11px 13px",marginBottom:"13px"}),border:`1px solid ${G.ac}`}},
      h('div',{style:{display:"flex",gap:"7px",flexWrap:"wrap"}},
        h(Inp,{value:nom,onChange:e=>setNom(e.target.value),placeholder:"Nom du client",style:{flex:2}}),
        h('button',{onClick:add,style:btn(G.ac,"#fff",{padding:"7px 13px",fontSize:"13px"})},"Ajouter"),
        h('button',{onClick:()=>setForm(false),style:btn("none",G.mut,{border:`1px solid ${G.b1}`,padding:"7px 10px",fontSize:"13px"})},"✕")
      )
    ):null,
    h('div',{style:{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",marginBottom:"11px"}},
      h(Inp,{value:search,onChange:e=>setSearch(e.target.value),placeholder:"🔍 Rechercher...",style:{width:"330px",maxWidth:"100%",marginBottom:"0"}}),
      h('button',{onClick:()=>setSearch(""),style:{fontSize:"12px",color:G.re,background:G.re+"15",border:`1px solid ${G.re}30`,padding:"7px 10px",borderRadius:"7px",cursor:"pointer"}},"✕ Réinitialiser")
    ),
    clients.length===0?h(EmptyState,{icon:"👥",msg:"Aucun client"}):
    h('div',{style:card({overflow:"hidden"})},
      h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
        h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
          ["Nom","Commandes","Total","💸 Dette","Actions"].map(x=>h('th',{key:x,style:tbh},x))
        )),
        h('tbody',null,
          ...stats.map((c,i)=>h('tr',{key:c.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
            h('td',{style:tbd({fontWeight:500}),onDoubleClick:()=>{setEd(c.id);setEv(c.nom);}},
              ed===c.id?h('input',{className:"ci",value:ev,autoFocus:true,onChange:e=>setEv(e.target.value),onBlur:()=>commit(c.id),onKeyDown:e=>{if(e.key==="Enter")commit(c.id);if(e.key==="Escape")setEd(null);}}):
              h('span',{onClick:()=>setDet(c.id),style:{cursor:"pointer",color:G.acL,textDecoration:"underline",textDecorationColor:G.acBd}},c.nom)
            ),
            h('td',{style:tbd()},h('span',{onClick:()=>setDet(c.id),style:{padding:"2px 7px",background:G.acBg,border:`1px solid ${G.acBd}`,borderRadius:"6px",color:G.acL,fontSize:"11px",cursor:"pointer"}},"🧾 "+c.nc)),
            h('td',{style:tbd({color:c.tot>0?G.te:"#333",fontWeight:c.tot>0?600:400})},c.tot>0?c.tot.toLocaleString()+" GMD":"—"),
            h('td',{style:tbd()},
              h('span',{style:{fontWeight:700,color:c.dette>0?G.re:c.dette<0?G.gr:G.dim}},
                c.dette===0?"✓ Soldé":c.dette.toLocaleString()+" GMD"
              )
            ),
            h('td',{style:tbd({display:"flex",gap:"5px"})},
              h('button',{onClick:()=>setDet(c.id),style:{background:G.acBg,color:G.acL,border:`1px solid ${G.acBd}`,padding:"3px 8px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"Voir"),
              h('button',{onClick:()=>{if(!confirm("Supprimer ce client ?"))return;del(c.id);},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
            )
          )),
          h('tr',{style:{borderTop:`2px solid ${G.b1}`,background:G.d2}},
            h('td',{colSpan:3,style:{padding:"9px 12px",fontSize:"11px",color:G.mut}},`${stats.length} client(s)`),
            h('td',{style:{padding:"9px 12px",color:grandDette>0?G.re:G.gr,fontWeight:700}},grandDette>0?grandDette.toLocaleString()+" GMD dûs":"✓ Tous soldés"),
            h('td',null)
          )
        )
      ),
      h('div',{style:{padding:"6px 12px",borderTop:"1px solid #141420",fontSize:"10px",color:"#333"}},"Double-clic sur un nom pour modifier")
    )
  );
}

// ── PRODUITS ─────────────────────────────────────────────────────────────────
function Pros({db,setDb,T}){
  const {produits,commandes,magasins}=db;
  const [search,setSearch]=useState("");
  const [fMag,setFMag]=useState("");
  const [form,setForm]=useState(false);
  const [editId,setEditId]=useState(null); // id du produit en cours de modification
  // magTypes: { magasinId: {truck:bool, container:bool} }
  const [np,setNp]=useState({nom:"",magTypes:{}});
  const [ed,setEd]=useState(null);
  const [ev,setEv]=useState("");

  function initMagTypes(prod){
    // Build magTypes from existing product's magasins + approvisionnements
    const mt={};
    (prod.magasins||[]).forEach(mid=>{
      const approvs=(prod.approvisionnements||[]).filter(a=>a.magasinId===mid);
      mt[mid]={
        truck:approvs.some(a=>a.type==="TRUCK"),
        container:approvs.some(a=>a.type==="CONTAINER")
      };
    });
    return mt;
  }

  function openEdit(prod){
    setNp({nom:prod.nom,magTypes:initMagTypes(prod)});
    setEditId(prod.id);
    setForm(false);
  }
  function openAdd(){setNp({nom:"",magTypes:{}});setEditId(null);setForm(true);}

  function toggleMag(magId){
    setNp(p=>{
      const mt={...p.magTypes};
      if(mt[magId]) delete mt[magId];
      else mt[magId]={truck:true,container:false};
      return{...p,magTypes:mt};
    });
  }
  function toggleType(magId,type){
    setNp(p=>{
      const cur=p.magTypes[magId]||{truck:false,container:false};
      return{...p,magTypes:{...p.magTypes,[magId]:{...cur,[type]:!cur[type]}}};
    });
  }

  function buildApprovsFromMagTypes(magTypes){
    const date=new Date().toISOString().slice(0,10);
    const approv=[];
    Object.entries(magTypes).forEach(([mid,types])=>{
      if(types.truck) approv.push({magasinId:Number(mid),type:"TRUCK",date});
      if(types.container) approv.push({magasinId:Number(mid),type:"CONTAINER",date});
    });
    return approv;
  }

  function save(){
    if(!np.nom.trim())return T("Nom requis",true);
    const selectedMags=Object.keys(np.magTypes).filter(k=>np.magTypes[k].truck||np.magTypes[k].container).map(Number);
    if(!selectedMags.length)return T("Cochez au moins un magasin avec un type",true);
    const nomUp=np.nom.trim().toUpperCase();
    const approv=buildApprovsFromMagTypes(np.magTypes);

    if(editId!==null){
      // Update existing product
      setDb(p=>({...p,produits:p.produits.map(x=>x.id===editId?{...x,nom:nomUp,magasins:selectedMags,approvisionnements:approv}:x)}));
      T("Produit mis à jour !");
    } else {
      // Create new — check name doesn't exist
      const existing=produits.find(p=>p.nom===nomUp);
      if(existing)return T("Un produit avec ce nom existe déjà. Cliquez sur ✏ pour le modifier.",true);
      const id=gid(produits);
      setDb(p=>({...p,produits:[...p.produits,{id,nom:nomUp,magasins:selectedMags,approvisionnements:approv}]}));
      T("Produit créé !");
    }
    setNp({nom:"",magTypes:{}});setForm(false);setEditId(null);
  }

  function del(id){
    if(commandes.some(c=>c.lignes.some(l=>l.produitId===id)))return T("Produit utilisé dans une commande",true);
    setDb(p=>({...p,produits:p.produits.filter(x=>x.id!==id)}));T("Supprimé");
  }
  function commitNom(id){setDb(p=>({...p,produits:p.produits.map(x=>x.id===id?{...x,nom:ev.trim().toUpperCase()}:x)}));setEd(null);}

  const filtered=produits.filter(p=>{
    if(fMag&&!(p.magasins||[]).includes(Number(fMag)))return false;
    if(search&&!p.nom.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const chk=(checked,onChange,label,color)=>h('label',{style:{display:"flex",alignItems:"center",gap:"6px",cursor:"pointer",userSelect:"none"}},
    h('input',{type:"checkbox",checked,onChange,style:{width:"14px",height:"14px",accentColor:color||G.ac}}),
    h('span',{style:{fontSize:"12px",color:G.txt}},label)
  );

  // Shared form UI (add + edit)
  const showForm=form||editId!==null;
  const formTitle=editId!==null?"✏ MODIFIER PRODUIT":"NOUVEAU PRODUIT";

  return h('div',{className:"fu"},
    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"9px"}},
      h('div',null,
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},"Produits"),
        h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"2px"}},`${produits.length} produit(s)`)
      ),
      h('button',{onClick:openAdd,style:btn(G.ac,"#fff")},"+ Ajouter")
    ),

    // Form (add or edit)
    showForm?h('div',{className:"fu",style:{...card({padding:"14px 16px",marginBottom:"14px"}),border:`1px solid ${G.ac}`}},
      h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.acL,marginBottom:"12px"}},formTitle),
      h(Lbl,{label:"Nom du produit *",style:{marginBottom:"14px"}},
        h(Inp,{value:np.nom,onChange:e=>setNp(p=>({...p,nom:e.target.value})),placeholder:"Ex: RICE 50KG"})
      ),
      h(Lbl,{label:"Magasins & approvisionnements *"},
        magasins.length===0
          ?h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"4px"}},"Aucun magasin créé.")
          :h('div',{style:{display:"flex",flexDirection:"column",gap:"8px",marginTop:"6px"}},
            ...magasins.map(m=>{
              const entry=np.magTypes[m.id];
              const checked=!!entry;
              const truck=entry?.truck||false;
              const container=entry?.container||false;
              return h('div',{key:m.id,style:{background:G.d2,borderRadius:"8px",padding:"10px 13px",border:`1px solid ${checked?G.acBd:G.b1}`,transition:"border .15s"}},
                h('div',{style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"10px"}},
                  chk(checked,()=>toggleMag(m.id),"🏪 "+m.nom),
                  checked?h('div',{style:{display:"flex",gap:"10px"}},
                    chk(truck,()=>toggleType(m.id,"truck"),"🚛 TRUCK",G.am),
                    chk(container,()=>toggleType(m.id,"container"),"📦 CONTAINER",G.ac)
                  ):null
                )
              );
            })
          )
      ),
      h('div',{style:{display:"flex",gap:"8px",marginTop:"14px"}},
        h('button',{onClick:save,style:btn(G.ac,"#fff")},editId!==null?"💾 Enregistrer":"Créer"),
        h('button',{onClick:()=>{setForm(false);setEditId(null);setNp({nom:"",magTypes:{}});},style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"Annuler")
      )
    ):null,

    // Filters
    h('div',{style:{display:"flex",gap:"9px",marginBottom:"12px",flexWrap:"wrap"}},
      h(Inp,{value:search,onChange:e=>setSearch(e.target.value),placeholder:"🔍 Rechercher...",style:{flex:"2 1 200px",marginBottom:"0"}}),
      h(Sel,{value:fMag,onChange:e=>setFMag(e.target.value),style:{flex:"1 1 150px"}},
        h('option',{value:""},"Tous les magasins"),
        ...magasins.map(m=>h('option',{key:m.id,value:m.id},m.nom))
      )
    ),

    produits.length===0?h(EmptyState,{icon:"📦",msg:"Aucun produit"}):
    h('div',{style:card({overflow:"hidden"})},
      h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
        h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
          ["Nom","Magasins","Approvisionnement","Commandes",""].map(x=>h('th',{key:x,style:tbh},x))
        )),
        h('tbody',null,
          ...filtered.map((p,i)=>{
            const nb=commandes.filter(c=>c.lignes.some(l=>l.produitId===p.id)).length;
            // Collect unique types per magasin
            const magApprovs=(p.magasins||[]).map(mid=>{
              const approvs=(p.approvisionnements||[]).filter(a=>a.magasinId===mid);
              const types=[...new Set(approvs.map(a=>a.type))];
              return{mid,types};
            });
            return h('tr',{key:p.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
              h('td',{style:tbd({fontWeight:500}),onDoubleClick:()=>{setEd(p.id);setEv(p.nom);}},
                ed===p.id?h('input',{className:"ci",value:ev,autoFocus:true,onChange:e=>setEv(e.target.value),onBlur:()=>commitNom(p.id),onKeyDown:e=>{if(e.key==="Enter")commitNom(p.id);if(e.key==="Escape")setEd(null);}}):p.nom
              ),
              h('td',{style:tbd()},
                h('div',{style:{display:"flex",gap:"4px",flexWrap:"wrap"}},
                  ...(p.magasins||[]).map(mid=>h('span',{key:mid,style:{fontSize:"10px",background:G.acBg,color:G.acL,border:`1px solid ${G.acBd}`,padding:"1px 7px",borderRadius:"10px"}},
                    mN(magasins,mid)
                  ))
                )
              ),
              h('td',{style:tbd()},
                h('div',{style:{display:"flex",gap:"4px",flexWrap:"wrap"}},
                  ...magApprovs.flatMap(({mid,types})=>
                    types.map(type=>h('span',{key:mid+type,style:{fontSize:"10px",background:type==="TRUCK"?G.am+"22":G.ac+"22",color:type==="TRUCK"?G.am:G.acL,border:`1px solid ${type==="TRUCK"?G.am+"44":G.acBd}`,padding:"1px 7px",borderRadius:"10px"}},
                      (type==="TRUCK"?"🚛 ":"📦 ")+mN(magasins,mid)
                    ))
                  )
                )
              ),
              h('td',{style:tbd({color:nb>0?G.acL:"#333"})},nb>0?nb+" cmd(s)":"—"),
              h('td',{style:tbd({display:"flex",gap:"5px"})},
                h('button',{onClick:()=>openEdit(p),style:{background:G.acBg,color:G.acL,border:`1px solid ${G.acBd}`,padding:"3px 8px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✏"),
                h('button',{onClick:()=>{if(!confirm("Supprimer ce produit ?"))return;del(p.id);},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
              )
            );
          }),
          h('tr',{style:{borderTop:`2px solid ${G.b1}`,background:G.d2}},
            h('td',{style:{padding:"9px 12px",fontSize:"11px",color:G.mut}},`${filtered.length} produit(s)`),
            h('td',null),h('td',null),h('td',null),h('td',null)
          )
        )
      ),
      h('div',{style:{padding:"6px 12px",borderTop:"1px solid #141420",fontSize:"10px",color:"#333"}},"Double-clic sur le nom pour modifier · ✏ pour changer les magasins")
    )
  );
}

// ── PRINT CSS ─────────────────────────────────────────────────────────────────
(function(){
  const style=document.createElement('style');
  style.textContent=`
    @media print {
      nav, button, input, select { display:none!important; }
      body { background:#fff!important; color:#000!important; }
      div[style*="width:195px"] { display:none!important; }
      * { background:transparent!important; border-color:#ccc!important; color:#000!important; }
      table { width:100%!important; }
      th, td { color:#000!important; border:1px solid #ccc!important; }
    }
  `;
  document.head.appendChild(style);
})();

// ── RENDER ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(h(App,null));
