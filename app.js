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
