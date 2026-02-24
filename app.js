const {createElement:h,useState,useEffect,Fragment}=React;

// ── DB ──────────────────────────────────────────────────────────────────────
const KEY="sv5";
const EMPTY={clients:[],produits:[],magasins:[],commandes:[]};
function loadDb(){try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):EMPTY;}catch{return EMPTY;}}
function gid(a){return a.length?Math.max(...a.map(x=>x.id))+1:1;}
function tCmd(c){return c.lignes.reduce((s,l)=>s+(l.amount||0),0);}
function cN(cs,id){return(cs.find(c=>c.id===id)||{}).nom||"—";}
function mN(ms,id){return(ms.find(m=>m.id===id)||{}).nom||"—";}
function pN(ps,id){return(ps.find(p=>p.id===id)||{}).nom||"—";}
function fmtDate(d){
  // Affichage: YYYY-MM-DD -> JJ/MM/AAAA
  if(!d||typeof d!=="string") return d||"—";
  const m=d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return d;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
function dp(mag,pid,cmds){
  const ini=((mag&&mag.stock)||{})[pid]||0;
  const vendu=cmds.filter(c=>c.magasinId===(mag&&mag.id)).flatMap(c=>c.lignes).filter(l=>l.produitId===pid).reduce((s,l)=>s+(l.qty||0),0);
  return ini-vendu;
}

// ── COLORS ──────────────────────────────────────────────────────────────────
const G={bg:"#09090f",card:"#13131e",d2:"#0f0f18",b1:"#1e1e2e",b2:"#1a1a26",
  txt:"#e2e0db",dim:"#888",mut:"#444",ac:"#5b5bf6",acL:"#8b8bf5",
  acBg:"#5b5bf615",acBd:"#5b5bf630",gr:"#22c55e",am:"#f59e0b",re:"#ef4444",te:"#a8e6cf"};

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
function Inp(props){
  return h('input',{style:{...IS,...(props.style||{})},...props});
}
function Sel({value,onChange,children,style:s}){
  return h('select',{value,onChange,style:{...IS,...(s||{}),color:value?G.txt:G.mut}},children);
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

// ── APP ──────────────────────────────────────────────────────────────────────
function App(){
  const [db,setDb]=useState(EMPTY);
  const [tab,setTab]=useState("home");
  const [toast,setToast]=useState(null);
  useEffect(()=>FirebaseDB.subscribe(setDb),[]);
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
    // Sidebar
    h('div',{style:{width:"195px",background:"#0d0d14",borderRight:`1px solid ${G.b2}`,display:"flex",flexDirection:"column",padding:"18px 0",flexShrink:0}},
      h('div',{style:{padding:"0 15px 16px",borderBottom:`1px solid ${G.b2}`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"14px",color:"#fff"}},"SALES.DB"),
        h('div',{style:{fontSize:"9px",color:"#2a2a3a",letterSpacing:"1px",marginTop:"2px"}},"GESTION DES VENTES")
      ),
      h('nav',{style:{padding:"10px 8px",flex:1}},
        ...tabs.map(t=>h('button',{key:t.id,onClick:()=>setTab(t.id),style:{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:"7px",marginBottom:"3px",background:tab===t.id?G.acBg:"transparent",color:tab===t.id?G.acL:"#555",border:tab===t.id?`1px solid ${G.acBd}`:"1px solid transparent",fontSize:"13px",display:"flex",alignItems:"center",gap:"8px"}},
          h('span',null,t.icon),
          h('span',{style:{flex:1}},t.label),
          t.n!==null?h('span',{style:{background:G.d2,color:t.n>0?"#666":"#2a2a3a",borderRadius:"8px",padding:"1px 6px",fontSize:"10px"}},t.n):null
        ))
      )
    ),
    // Main
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
      if(!cN(clients,c.clientId).toLowerCase().includes(s)&&
         !mN(magasins,c.magasinId).toLowerCase().includes(s)&&
         !String(c.id).includes(s)&&
         !c.lignes.some(l=>pN(produits,l.produitId).toLowerCase().includes(s)))return false;}
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);

  // Detail view
  if(det!==null){
    const c=commandes.find(x=>x.id===det);
    if(!c){setDet(null);return null;}
    const tot=tCmd(c);
    return h('div',{className:"fu"},
      h('button',{onClick:()=>setDet(null),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",fontSize:"13px",marginBottom:"18px"}},"← Accueil"),
      h('div',{style:{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"10px",marginBottom:"18px"}},
        h('div',null,
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},`Commande #${c.id}`),
          h('div',{style:{color:G.dim,fontSize:"12px",marginTop:"3px"}},`${fmtDate(c.date)} · ${c.lignes.length} ligne(s)`)
        ),
        tot>0?h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:G.te}},tot.toLocaleString()+" GMD"):null
      ),
      h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}},
        h('div',{style:card({padding:"12px 14px"})},h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}},"Client"),h('div',{style:{fontWeight:600}},cN(clients,c.clientId))),
        h('div',{style:card({padding:"12px 14px"})},h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}},"Magasin"),h('div',{style:{fontWeight:600,color:G.acL}},"🏪 "+mN(magasins,c.magasinId)))
      ),
      h('div',{style:card({overflow:"hidden"})},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["Produit","Qté","Prix","Montant","Note"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...c.lignes.map((l,i)=>h('tr',{key:i,className:"trh",style:{borderBottom:"1px solid #141420"}},
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
  const stats=[
    {icon:"🧾",l:"Commandes",v:commandes.length,c:G.ac},
    {icon:"👥",l:"Clients",v:clients.length,c:G.acL},
    {icon:"🏪",l:"Magasins",v:magasins.length,c:"#a78bfa"},
    {icon:"📦",l:"Produits",v:produits.length,c:"#7c6fcd"},
    {icon:"💰",l:"Total ventes",v:totalAmt>0?totalAmt.toLocaleString()+" GMD":"—",c:G.te},
    {icon:"📅",l:"Aujourd'hui",v:commandes.filter(c=>c.date===today).length,c:G.am},
  ];

  const hf=search||fM||fA||fB;
  const rowTotal=rows.reduce((s,c)=>s+tCmd(c),0);

  return h('div',{className:"fu"},
    h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"22px",marginBottom:"4px"}},"Tableau de bord"),
    h('div',{style:{color:G.mut,fontSize:"12px",marginBottom:"18px"}},"Toutes les commandes"),
    // Stats
    h('div',{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"10px",marginBottom:"20px"}},
      ...stats.map((s,i)=>h('div',{key:i,style:card({padding:"12px 14px"})},
        h('div',{style:{fontSize:"18px",marginBottom:"4px"}},s.icon),
        h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px"}},s.l),
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"16px",color:s.c}},s.v)
      ))
    ),
    // Filters
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
        h('button',{onClick:()=>{setSearch("");setFM("");setFA("");setFB("");},style:{fontSize:"11px",color:G.re,background:G.re+"15",border:`1px solid ${G.re}30`,padding:"3px 10px",borderRadius:"5px"}},"✕ Réinitialiser")
      ):null
    ),
    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}},
      h('div',{style:{fontSize:"11px",color:G.mut}},`${rows.length} commande(s)`),
      h('button',{onClick:()=>setTab("cmd"),style:btn(G.ac,"#fff")},"+  Nouvelle commande")
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
                h('td',{style:tbd({color:"#777",whiteSpace:"nowrap"})},fmtDate(c.date)),
                h('td',{style:tbd({fontWeight:600,color:"#d0cec9"})},cN(clients,c.clientId)),
                h('td',{style:tbd()},h(Tag,{label:"🏪 "+mN(magasins,c.magasinId)})),
                h('td',{style:tbd()},
                  ...c.lignes.slice(0,2).map((l,j)=>h('span',{key:j,style:{fontSize:"10px",color:G.dim,background:G.d2,padding:"2px 5px",borderRadius:"3px",marginRight:"3px"}},pN(produits,l.produitId)+" ×"+l.qty)),
                  c.lignes.length>2?h('span',{style:{fontSize:"10px",color:G.mut}},`+${c.lignes.length-2}`):null
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
  const [form,setForm]=useState(false);
  const [nc,setNc]=useState({clientId:"",magasinId:"",date:new Date().toISOString().slice(0,10),lignes:[]});
  const [sCli,setSCli]=useState("");
  const [sPro,setSPro]=useState("");
  const [det,setDet]=useState(null);
  const mag=magasins.find(m=>m.id===Number(nc.magasinId))||null;
  const selCli=clients.find(c=>c.id===nc.clientId)||null;

  function create(){
    let cid=nc.clientId;
    if(!cid&&sCli){const m=clients.filter(c=>c.nom.toLowerCase()===sCli.toLowerCase());if(m.length===1)cid=m[0].id;}
    if(!cid)return T("Sélectionnez un client dans la liste",true);
    if(!nc.magasinId)return T("Sélectionnez un magasin",true);
    if(!nc.lignes.length)return T("Sélectionnez au moins un produit",true);
    const id=gid(commandes);
    setDb(p=>({...p,commandes:[...p.commandes,{id,clientId:Number(cid),magasinId:Number(nc.magasinId),date:nc.date,lignes:nc.lignes,total:nc.lignes.reduce((s,l)=>s+(l.amount||0),0)}]}));
    setNc({clientId:"",magasinId:"",date:new Date().toISOString().slice(0,10),lignes:[]});
    setSCli("");setSPro("");setForm(false);
    T(`Commande #${id} créée !`);
  }
  function toggleP(p){
    const has=nc.lignes.find(l=>l.produitId===p.id);
    if(has)setNc(prev=>({...prev,lignes:prev.lignes.filter(l=>l.produitId!==p.id)}));
    else setNc(prev=>({...prev,lignes:[...prev.lignes,{produitId:p.id,qty:1,up:null,amount:null,dnote:null}]}));
  }
  function updL(pid,f,v){setNc(prev=>({...prev,lignes:prev.lignes.map(l=>l.produitId===pid?{...l,[f]:f==="dnote"?(v||null):(v?Number(v):null)}:l)}));}
  function updQ(pid,v){setNc(prev=>({...prev,lignes:prev.lignes.map(l=>l.produitId===pid?{...l,qty:Number(v)||1}:l)}));}

  const fClis=[...clients].filter(c=>c.nom.toLowerCase().includes(sCli.toLowerCase())).sort((a,b)=>a.nom.localeCompare(b.nom));
  const fPros=produits.filter(p=>p.nom.toLowerCase().includes(sPro.toLowerCase()));
  const grandTotal=commandes.reduce((s,c)=>s+tCmd(c),0);

  // Detail view
  if(det!==null){
    const c=commandes.find(x=>x.id===det);
    if(!c){setDet(null);return null;}
    const tot=tCmd(c);
    return h('div',{className:"fu"},
      h('button',{onClick:()=>setDet(null),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",fontSize:"13px",marginBottom:"18px"}},"← Retour"),
      h('div',{style:{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"10px",marginBottom:"18px"}},
        h('div',null,
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},`Commande #${c.id}`),
          h('div',{style:{color:G.dim,fontSize:"12px",marginTop:"3px"}},fmtDate(c.date))
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
            ...c.lignes.map((l,i)=>h('tr',{key:i,className:"trh",style:{borderBottom:"1px solid #141420"}},
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

  return h('div',{className:"fu"},
    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px",flexWrap:"wrap",gap:"10px"}},
      h('div',null,
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},"Commandes"),
        h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"2px"}},`${commandes.length} commande(s)`)
      ),
      h('button',{onClick:()=>setForm(v=>!v),style:btn(G.ac,"#fff")},form?"✕ Fermer":"+ Nouvelle commande")
    ),

    // Form
    form?h('div',{className:"fu",style:{...card({padding:"16px",marginBottom:"16px"}),border:`1px solid ${G.ac}`}},
      h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.acL,marginBottom:"14px"}},"NOUVELLE COMMANDE"),
      !clients.length?h('div',{style:{color:G.re,fontSize:"12px"}},"⚠ ",h('button',{onClick:()=>setTab("cli"),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:"12px"}},"Créer un client →")):
      !magasins.length?h('div',{style:{color:G.re,fontSize:"12px"}},"⚠ ",h('button',{onClick:()=>setTab("mag"),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:"12px"}},"Créer un magasin →")):
      !produits.length?h('div',{style:{color:G.re,fontSize:"12px"}},"⚠ ",h('button',{onClick:()=>setTab("pro"),style:{color:G.acL,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:"12px"}},"Créer des produits →")):
      h('div',null,
        // Row 1: client, magasin, date
        h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"14px"}},
          h(Lbl,{label:"Client *"},
            h(SearchDrop,{
              value:sCli,onChange:v=>{setSCli(v);setNc(p=>({...p,clientId:""}));},
              results:fClis,
              onSelect:c=>{setNc(p=>({...p,clientId:c.id}));setSCli(c.nom);},
              selected:selCli,
              onClear:()=>{setNc(p=>({...p,clientId:""}));setSCli("");},
              placeholder:"🔍 Rechercher un client...",
              getLabel:c=>c.nom
            })
          ),
          h(Lbl,{label:"Magasin *"},
            h(Sel,{value:nc.magasinId,onChange:e=>setNc(p=>({...p,magasinId:e.target.value,lignes:[]}))},
              h('option',{value:""},"— Choisir —"),
              ...magasins.map(m=>h('option',{key:m.id,value:m.id},"🏪 "+m.nom))
            )
          ),
          h(Lbl,{label:"Date *"},
            h(Inp,{type:"date",value:nc.date,onChange:e=>setNc(p=>({...p,date:e.target.value}))})
          )
        ),
        // Produits search
        nc.magasinId?h('div',null,
          h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}},
            h('div',{style:{fontSize:"10px",color:G.acL,textTransform:"uppercase",fontWeight:600}},"Produits — 🏪 "+(mag?mag.nom:"")),
            h('div',{style:{fontSize:"10px",color:G.mut}},`${nc.lignes.length} sélectionné(s)`)
          ),
          // Search field
          h(SearchDrop,{
            value:sPro,onChange:v=>setSPro(v),
            results:fPros,
            onSelect:p=>{toggleP(p);setSPro("");},
            selected:null,
            onClear:()=>setSPro(""),
            placeholder:"🔍 Tapez un nom de produit...",
            getLabel:p=>p.nom,
            getSubLabel:p=>{
              const d=dp(mag,p.id,commandes);
              const hasS=mag&&((mag.stock||{})[p.id]!==undefined);
              const sel=nc.lignes.some(l=>l.produitId===p.id);
              return (hasS?"Stock: "+d+" ":"")+( sel?"✓ déjà sélectionné":"");
            }
          }),
          // Selected products
          nc.lignes.length>0?h('div',{style:{display:"flex",flexDirection:"column",gap:"6px",marginTop:"8px",marginBottom:"8px"}},
            ...nc.lignes.map(ligne=>{
              const p=produits.find(x=>x.id===ligne.produitId);
              if(!p)return null;
              return h('div',{key:p.id,style:{background:G.acBg,border:`1px solid ${G.acBd}`,borderRadius:"7px",padding:"8px 11px"}},
                h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}},
                  h('span',{style:{fontWeight:600,fontSize:"12px",color:"#c0beff"}},"✓ "+p.nom),
                  h('button',{onClick:()=>toggleP(p),style:{color:G.re,background:"none",border:"none",cursor:"pointer",fontSize:"12px"}},"✕")
                ),
                h('div',{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"5px"}},
                  ...[["Qté *","qty","number"],["Prix","up","number"],["Montant","amount","number"],["Note","dnote","text"]].map(([l,f,t])=>
                    h(Lbl,{key:f,label:l},
                      h(Inp,{type:t,value:f==="qty"?ligne.qty:(ligne[f]||""),onChange:e=>f==="qty"?updQ(p.id,e.target.value):updL(p.id,f,e.target.value),placeholder:"—",style:{fontSize:"11px",padding:"4px 7px"}})
                    )
                  )
                )
              );
            }),
            nc.lignes.reduce((s,l)=>s+(l.amount||0),0)>0?
              h('div',{style:{background:G.d2,borderRadius:"7px",padding:"7px 11px",display:"flex",justifyContent:"space-between"}},
                h('span',{style:{fontSize:"11px",color:G.mut}},`${nc.lignes.length} produit(s)`),
                h('span',{style:{color:G.te,fontWeight:700,fontSize:"13px"}},nc.lignes.reduce((s,l)=>s+(l.amount||0),0).toLocaleString()+" GMD")
              ):null
          ):null
        ):null,
        h('div',{style:{display:"flex",gap:"9px",marginTop:"12px"}},
          h('button',{onClick:create,style:btn(G.ac,"#fff")},"Créer la commande"),
          h('button',{onClick:()=>{setForm(false);setSCli("");setSPro("");},style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"Annuler")
        )
      )
    ):null,

    // Table
    commandes.length===0?h(EmptyState,{icon:"🧾",msg:"Aucune commande"}):
    h('div',{style:card({overflow:"hidden"})},
      h('div',{style:{overflowX:"auto"}},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["N°","Date","Client","Magasin","Produits","Montant",""].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...[...commandes].sort((a,b)=>b.id-a.id).map((c,i)=>{
              const tot=tCmd(c);
              return h('tr',{key:c.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                h('td',{style:tbd({color:G.dim,fontWeight:700})},`#${c.id}`),
                h('td',{style:tbd({color:"#777",whiteSpace:"nowrap"})},fmtDate(c.date)),
                h('td',{style:tbd({fontWeight:600,color:"#d0cec9"})},cN(clients,c.clientId)),
                h('td',{style:tbd()},h(Tag,{label:"🏪 "+mN(magasins,c.magasinId)})),
                h('td',{style:tbd()},
                  ...c.lignes.slice(0,2).map((l,j)=>h('span',{key:j,style:{fontSize:"10px",color:G.dim,background:G.d2,padding:"2px 5px",borderRadius:"3px",marginRight:"3px"}},pN(produits,l.produitId))),
                  c.lignes.length>2?h('span',{style:{fontSize:"10px",color:G.mut}},`+${c.lignes.length-2}`):null
                ),
                h('td',{style:tbd({color:tot>0?G.te:"#333",fontWeight:tot>0?700:400,whiteSpace:"nowrap"})},tot>0?tot.toLocaleString()+" GMD":"—"),
                h('td',{style:tbd({display:"flex",gap:"5px"})},
                  h('button',{onClick:()=>setDet(c.id),style:{background:G.acBg,color:G.acL,border:`1px solid ${G.acBd}`,padding:"3px 8px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"Détail"),
                  h('button',{onClick:()=>{if(!confirm("Supprimer cette commande ?"))return;setDb(p=>({...p,commandes:p.commandes.filter(x=>x.id!==c.id)}));T("Commande supprimée — stock restauré ✓");},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
                )
              );
            }),
            h(TotalRow,{cols:6,label:`${commandes.length} commande(s)`,amount:grandTotal})
          )
        )
      )
    )
  );
}

// ── MAGASINS ─────────────────────────────────────────────────────────────────
function Mags({db,setDb,T}){
  const {magasins,produits,commandes,clients}=db;
  const [sel,setSel]=useState(null);
  const [addF,setAddF]=useState(false);
  const [nom,setNom]=useState("");
  const [editSt,setEditSt]=useState(false);
  const [st,setSt]=useState({});
  const mag=magasins.find(m=>m.id===sel)||null;

  function add(){if(!nom.trim())return T("Nom requis",true);const id=gid(magasins);setDb(p=>({...p,magasins:[...p.magasins,{id,nom:nom.trim().toUpperCase(),stock:{}}]}));setSel(id);setNom("");setAddF(false);T("Magasin créé !");}
  function del(id){if(commandes.some(c=>c.magasinId===id))return T("Ce magasin a des commandes",true);setDb(p=>({...p,magasins:p.magasins.filter(m=>m.id!==id)}));if(sel===id)setSel(null);T("Supprimé");}
  function startE(){const s={};produits.forEach(p=>{s[p.id]=((mag&&mag.stock)||{})[p.id]||"";});setSt(s);setEditSt(true);}
  function saveS(){const ns={};Object.entries(st).forEach(([pid,val])=>{const n=Number(val);if(n>0)ns[Number(pid)]=n;});setDb(p=>({...p,magasins:p.magasins.map(m=>m.id===sel?{...m,stock:ns}:m)}));setEditSt(false);T("Stock enregistré !");}

  function stInfo(m){return produits.map(p=>{const ini=((m.stock)||{})[p.id]||0;const sold=commandes.filter(c=>c.magasinId===m.id).flatMap(c=>c.lignes).filter(l=>l.produitId===p.id).reduce((s,l)=>s+(l.qty||0),0);return{...p,ini,sold,av:ini-sold};}).filter(p=>p.ini>0||p.sold>0);}
  const magCmds=mag?commandes.filter(c=>c.magasinId===mag.id):[];
  const magTotal=magCmds.reduce((s,c)=>s+tCmd(c),0);

  return h('div',{className:"fu",style:{display:"flex",gap:"20px",alignItems:"flex-start"}},
    // List
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
            h('button',{onClick:()=>{setSel(m.id);setEditSt(false);},style:{width:"100%",textAlign:"left",padding:"9px 11px",background:"none",border:"none",cursor:"pointer",color:isSel?G.acL:"#888"}},
              h('div',{style:{fontWeight:600,fontSize:"13px",marginBottom:"2px"}},"🏪 "+m.nom),
              h('div',{style:{fontSize:"10px",color:isSel?G.ac:G.mut}},nc+" cmd(s)")
            ),
            isSel?h('div',{style:{padding:"0 9px 8px",display:"flex",gap:"5px"}},
              h('button',{onClick:startE,style:{flex:1,background:"#2a2a3a",color:G.dim,border:"none",cursor:"pointer",padding:"4px",borderRadius:"5px",fontSize:"11px"}},"✏ Stock"),
              h('button',{onClick:()=>{if(!confirm("Supprimer ce magasin ?"))return;del(m.id);},style:{background:G.re+"15",color:G.re,border:`1px solid ${G.re}30`,padding:"4px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
            ):null
          );
        })
      )
    ),
    // Detail
    mag?h('div',{style:{flex:1,minWidth:0}},
      // Summary card
      h('div',{style:card({padding:"14px 16px",marginBottom:"12px"})},
        h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}},
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"17px"}},"🏪 "+mag.nom),
          h('button',{onClick:startE,style:btn(G.ac,"#fff",{padding:"5px 12px",fontSize:"12px"})},"✏ Modifier stock")
        ),
        h('div',{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px"}},
          ...[
            ["Produits",Object.keys(mag.stock||{}).filter(k=>(mag.stock[k]||0)>0).length],
            ["Commandes",commandes.filter(c=>c.magasinId===mag.id).length],
            ["Clients",new Set(commandes.filter(c=>c.magasinId===mag.id).map(c=>c.clientId)).size]
          ].map(([l,v])=>h('div',{key:l,style:{background:G.d2,borderRadius:"7px",padding:"8px 11px"}},
            h('div',{style:{fontSize:"9px",color:G.mut,textTransform:"uppercase",marginBottom:"2px"}},l),
            h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"15px"}},v)
          ))
        )
      ),
      // Stock edit
      editSt?h('div',{className:"fu",style:{...card({padding:"14px 16px",marginBottom:"12px"}),border:`1px solid ${G.ac}`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.acL,marginBottom:"3px"}},"Stock initial — "+mag.nom),
        h('div',{style:{color:G.mut,fontSize:"11px",marginBottom:"12px"}},"Quantité initiale par produit (laissez vide si absent)"),
        produits.length===0?h('div',{style:{color:G.mut,fontSize:"12px"}},"Aucun produit."):
        h('div',{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:"7px",marginBottom:"12px"}},
          ...produits.map(p=>{
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
          h('div',{style:{fontSize:"10px",color:G.mut}},"Initial − Vendu = Disponible")
        ),
        stInfo(mag).length===0?
          h('div',{style:{padding:"25px",textAlign:"center",color:"#333",fontSize:"12px"}},"Aucun stock. ",h('button',{onClick:startE,style:{color:G.acL,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:"12px"}},"Ajouter →")):
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["Produit","Initial","Vendu","Disponible"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            ...stInfo(mag).map((p,i)=>{
              const pct=p.ini>0?(p.av/p.ini)*100:0;
              const col=p.av<=0?G.am:pct<25?G.am:G.gr;
              return h('tr',{key:p.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                h('td',{style:tbd({fontWeight:500})},p.nom),
                h('td',{style:tbd({color:G.mut})},p.ini),
                h('td',{style:tbd({color:G.am})},p.sold>0?"-"+p.sold:"0"),
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
      // Commandes table
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
              h('td',{style:tbd({color:"#777",whiteSpace:"nowrap"})},fmtDate(c.date)),
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
  const [editSolde,setEditSolde]=useState(false);
  const [newSolde,setNewSolde]=useState({});
  const [edSoldeRow,setEdSoldeRow]=useState(null);
  const [edSoldeVal,setEdSoldeVal]=useState("");

  const [solde,setSolde]=useState("");
  function add(){if(!nom.trim())return T("Nom requis",true);const id=gid(clients);setDb(p=>({...p,clients:[...p.clients,{id,nom:nom.trim().toUpperCase(),solde:solde?Number(solde):0}]}));setNom("");setSolde("");setForm(false);T("Client ajouté !");}
  function del(id){if(commandes.some(c=>c.clientId===id))return T("Ce client a des commandes",true);setDb(p=>({...p,clients:p.clients.filter(c=>c.id!==id)}));T("Supprimé");}
  function commit(id){setDb(p=>({...p,clients:p.clients.map(c=>c.id===id?{...c,nom:ev.trim().toUpperCase()}:c)}));setEd(null);}
  function updateSolde(id,val){setDb(p=>({...p,clients:p.clients.map(c=>c.id===id?{...c,solde:val?Number(val):0}:c)}));}

  const stats=clients.map(c=>({...c,nc:commandes.filter(o=>o.clientId===c.id).length,tot:commandes.filter(o=>o.clientId===c.id).reduce((s,o)=>s+tCmd(o),0)})).filter(c=>!search||c.nom.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.nom.localeCompare(b.nom));
  const grandTotal=stats.reduce((s,c)=>s+c.tot,0);

  if(det!==null){
    const cl=clients.find(c=>c.id===det);
    if(!cl){setDet(null);return null;}
    const cmds=commandes.filter(o=>o.clientId===det).sort((a,b)=>b.date.localeCompare(a.date));
    const totalCmds=cmds.reduce((s,c)=>s+tCmd(c),0);
    const paiements=(cl.paiements||[]).sort((a,b)=>b.date.localeCompare(a.date));
    const totalPaie=paiements.reduce((s,p)=>s+(p.montant||0),0);
    const soldeNet=totalCmds-totalPaie;

    return h('div',{className:"fu"},
      h('button',{onClick:()=>{setDet(null);setEditSolde(false);},style:{color:G.acL,background:"none",border:"none",cursor:"pointer",fontSize:"13px",marginBottom:"16px"}},"← Retour"),

      // Header
      h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}},
        h('div',null,
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"22px"}},cl.nom),
          h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"2px"}},`${cmds.length} commande(s) · ${paiements.length} paiement(s)`)
        ),
        h('button',{onClick:()=>setEditSolde(v=>!v),style:btn(G.gr,"#fff",{fontSize:"13px"})},"+ Ajouter un paiement")
      ),

      // Formulaire ajout paiement
      editSolde?h('div',{className:"fu",style:{...card({padding:"14px 16px",marginBottom:"16px"}),border:`1px solid ${G.gr}`}},
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.gr,marginBottom:"12px"}},"💳 Nouveau paiement"),
        h('div',{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"9px",marginBottom:"10px"}},
          h(Lbl,{label:"Date"},h(Inp,{type:"date",value:newSolde.date||new Date().toISOString().slice(0,10),onChange:e=>setNewSolde(s=>({...s,date:e.target.value}))})),
          h(Lbl,{label:"Montant (GMD)"},h(Inp,{type:"number",placeholder:"0",value:newSolde.montant||"",onChange:e=>setNewSolde(s=>({...s,montant:e.target.value}))})),
          h(Lbl,{label:"Type de paiement"},h(Sel,{value:newSolde.type||"cash",onChange:e=>setNewSolde(s=>({...s,type:e.target.value}))},
            h('option',{value:"cash"},"💵 Cash"),
            h('option',{value:"virement"},"🏦 Virement"),
            h('option',{value:"cheque"},"📄 Chèque"),
            h('option',{value:"mobile"},"📱 Mobile Money"),
            h('option',{value:"autre"},"🔄 Autre")
          ))
        ),
        h('div',{style:{display:"flex",gap:"8px"}},
          h('button',{onClick:()=>{
            const m=Number(newSolde.montant);
            if(!m||m<=0)return T("Montant invalide",true);
            const pid=Date.now();
            const paie={id:pid,date:newSolde.date||new Date().toISOString().slice(0,10),montant:m,type:newSolde.type||"cash"};
            setDb(p=>({...p,clients:p.clients.map(c=>c.id===det?{...c,paiements:[...(c.paiements||[]),paie]}:c)}));
            setNewSolde({});setEditSolde(false);T("Paiement ajouté !");
          },style:btn(G.gr,"#fff")},"✓ Enregistrer"),
          h('button',{onClick:()=>{setEditSolde(false);setNewSolde({});},style:btn("none",G.mut,{border:`1px solid ${G.b1}`})},"Annuler")
        )
      ):null,

      // Cartes résumé
      h('div',{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"18px"}},
        h('div',{style:card({padding:"14px 16px"})},
          h('div',{style:{fontSize:"10px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}},"Total commandes"),
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:G.te}},totalCmds>0?totalCmds.toLocaleString()+" GMD":"—")
        ),
        h('div',{style:card({padding:"14px 16px"})},
          h('div',{style:{fontSize:"10px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}},"Total payé"),
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:G.gr}},totalPaie>0?totalPaie.toLocaleString()+" GMD":"—")
        ),
        h('div',{style:{...card({padding:"14px 16px"}),border:`1px solid ${soldeNet>0?G.re+"55":soldeNet<0?G.gr+"55":G.b1}`}},
          h('div',{style:{fontSize:"10px",color:G.mut,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}},"Reste à payer"),
          h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"18px",color:soldeNet>0?G.re:soldeNet<0?G.gr:G.dim}},
            soldeNet===0?"✓ Soldé":soldeNet.toLocaleString()+" GMD"
          )
        )
      ),

      // Tableau commandes
      h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.txt,marginBottom:"8px"}},"🧾 Commandes"),
      h('div',{style:{...card({overflow:"hidden"}),marginBottom:"16px"}},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["#","Date","Magasin","Produits","Montant"].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            cmds.length===0
              ?h('tr',null,h('td',{colSpan:5,style:{padding:"20px",textAlign:"center",color:"#333",fontSize:"12px"}},"Aucune commande"))
              :cmds.map((c,i)=>h('tr',{key:c.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                h('td',{style:tbd({color:G.dim,fontWeight:600})},"#"+c.id),
                h('td',{style:tbd({color:"#777",whiteSpace:"nowrap"})},fmtDate(c.date)),
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

      // Tableau paiements
      h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"13px",color:G.txt,marginBottom:"8px"}},"💳 Paiements reçus"),
      h('div',{style:card({overflow:"hidden"})},
        h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
          h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
            ["Date","Montant","Type",""].map(x=>h('th',{key:x,style:tbh},x))
          )),
          h('tbody',null,
            paiements.length===0
              ?h('tr',null,h('td',{colSpan:4,style:{padding:"20px",textAlign:"center",color:"#333",fontSize:"12px"}},"Aucun paiement enregistré"))
              :paiements.map((p,i)=>{
                const typeIcons={"cash":"💵 Cash","virement":"🏦 Virement","cheque":"📄 Chèque","mobile":"📱 Mobile","autre":"🔄 Autre"};
                return h('tr',{key:p.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
                  h('td',{style:tbd({color:"#777",whiteSpace:"nowrap"})},fmtDate(p.date)),
                  h('td',{style:tbd({color:G.gr,fontWeight:700})},p.montant.toLocaleString()+" GMD"),
                  h('td',{style:tbd()},h(Tag,{label:typeIcons[p.type]||p.type,color:G.gr})),
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
      h('button',{onClick:()=>setForm(v=>!v),style:btn(G.ac,"#fff")},"+ Ajouter")
    ),
    form?h('div',{className:"fu",style:{...card({padding:"11px 13px",marginBottom:"13px"}),border:`1px solid ${G.ac}`}},
      h('div',{style:{display:"flex",gap:"7px",flexWrap:"wrap"}},
        h(Inp,{value:nom,onChange:e=>setNom(e.target.value),placeholder:"Nom du client",style:{flex:2}}),
        h(Inp,{type:"number",value:solde,onChange:e=>setSolde(e.target.value),placeholder:"Solde initial (GMD)",style:{flex:1,minWidth:"130px"}}),
        h('button',{onClick:add,style:btn(G.ac,"#fff",{padding:"7px 13px",fontSize:"13px"})},"Ajouter"),
        h('button',{onClick:()=>setForm(false),style:btn("none",G.mut,{border:`1px solid ${G.b1}`,padding:"7px 10px",fontSize:"13px"})},"✕")
      )
    ):null,
    h('div',{style:{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginBottom:'11px'}},
      h(Inp,{value:search,onChange:e=>setSearch(e.target.value),placeholder:"🔍 Rechercher...",style:{width:"330px",maxWidth:"100%",marginBottom:"0"}}),
      h('button',{onClick:()=>setSearch(''),style:{fontSize:'12px',color:G.re,background:G.re+'15',border:`1px solid ${G.re}30`,padding:'7px 10px',borderRadius:'7px'}},'✕ Réinitialiser')
    ),
    clients.length===0?h(EmptyState,{icon:"👥",msg:"Aucun client"}):
    h('div',{style:card({overflow:"hidden"})},
      h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
        h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
          ["Nom","Commandes","Total","Solde","Actions"].map(x=>h('th',{key:x,style:tbh},x))
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
              edSoldeRow===c.id
                ?h('div',{style:{display:"flex",gap:"5px",alignItems:"center"}},
                    h('input',{type:"number",value:edSoldeVal,autoFocus:true,
                      onChange:e=>setEdSoldeVal(e.target.value),
                      onKeyDown:e=>{
                        if(e.key==="Enter"){updateSolde(c.id,edSoldeVal);setEdSoldeRow(null);T("Solde mis à jour !");}
                        if(e.key==="Escape")setEdSoldeRow(null);
                      },
                      style:{...IS,width:"100px",padding:"3px 7px",fontSize:"12px"}}),
                    h('button',{onClick:()=>{updateSolde(c.id,edSoldeVal);setEdSoldeRow(null);T("Solde mis à jour !");},style:{background:G.gr+"22",color:G.gr,border:`1px solid ${G.gr}44`,padding:"3px 8px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✓"),
                    h('button',{onClick:()=>setEdSoldeRow(null),style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 6px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
                  )
                :h('div',{style:{display:"flex",alignItems:"center",gap:"7px"}},
                    (()=>{
                      const cl2=clients.find(x=>x.id===c.id)||{};
                      const totalP=(cl2.paiements||[]).reduce((s,p)=>s+(p.montant||0),0);
                      const reste=c.tot-totalP;
                      return h('span',{style:{color:reste>0?G.re:reste<0?G.gr:G.gr,fontWeight:600}},
                        reste===0?"✓ Soldé":(reste>0?"-":"+")+(Math.abs(reste)).toLocaleString()+" GMD"
                      );
                    })()
                  )
            ),
            h('td',{style:tbd({display:"flex",gap:"5px"})},
              h('button',{onClick:()=>setDet(c.id),style:{background:G.acBg,color:G.acL,border:`1px solid ${G.acBd}`,padding:"3px 8px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"Voir"),
              h('button',{onClick:()=>{if(!confirm("Supprimer ce client ?"))return;del(c.id);},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕")
            )
          )),
          h(TotalRow,{cols:4,label:`${stats.length} client(s)`,amount:grandTotal})
        )
      ),
      h('div',{style:{padding:"6px 12px",borderTop:"1px solid #141420",fontSize:"10px",color:"#333"}},"Double-clic sur un nom pour modifier")
    )
  );
}

// ── PRODUITS ──────────────────────────────────────────────────────────────────
function Pros({db,setDb,T}){
  const {produits,commandes}=db;
  const [search,setSearch]=useState("");
  const [form,setForm]=useState(false);
  const [np,setNp]=useState({nom:"",cat:""});
  const [ed,setEd]=useState(null);
  const [ev,setEv]=useState("");

  function add(){if(!np.nom.trim())return T("Nom requis",true);const id=gid(produits);setDb(p=>({...p,produits:[...p.produits,{id,nom:np.nom.trim().toUpperCase(),cat:np.cat.trim()}]}));setNp({nom:"",cat:""});setForm(false);T("Produit ajouté !");}
  function del(id){if(commandes.some(c=>c.lignes.some(l=>l.produitId===id)))return T("Produit utilisé dans une commande",true);setDb(p=>({...p,produits:p.produits.filter(x=>x.id!==id)}));T("Supprimé");}
  function commit(id,f){setDb(p=>({...p,produits:p.produits.map(x=>x.id===id?{...x,[f]:ev.trim().toUpperCase()}:x)}));setEd(null);}

  const filtered=produits.filter(p=>!search||p.nom.toLowerCase().includes(search.toLowerCase())||(p.cat||"").toLowerCase().includes(search.toLowerCase()));
  const totalCmds=filtered.reduce((s,p)=>s+commandes.filter(c=>c.lignes.some(l=>l.produitId===p.id)).length,0);

  return h('div',{className:"fu"},
    h('div',{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"9px"}},
      h('div',null,
        h('div',{style:{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"20px"}},"Produits"),
        h('div',{style:{color:G.mut,fontSize:"12px",marginTop:"2px"}},`${produits.length} produit(s)`)
      ),
      h('button',{onClick:()=>setForm(v=>!v),style:btn(G.ac,"#fff")},"+ Ajouter")
    ),
    form?h('div',{className:"fu",style:{...card({padding:"11px 13px",marginBottom:"13px"}),border:`1px solid ${G.ac}`}},
      h('div',{style:{display:"flex",gap:"7px",flexWrap:"wrap"}},
        h(Inp,{value:np.nom,onChange:e=>setNp(p=>({...p,nom:e.target.value})),placeholder:"Nom *",style:{flex:"2 1 130px"}}),
        h(Inp,{value:np.cat,onChange:e=>setNp(p=>({...p,cat:e.target.value})),placeholder:"Catégorie (opt.)",style:{flex:"2 1 130px"}}),
        h('button',{onClick:add,style:btn(G.ac,"#fff",{padding:"7px 13px",fontSize:"13px"})},"Ajouter"),
        h('button',{onClick:()=>setForm(false),style:btn("none",G.mut,{border:`1px solid ${G.b1}`,padding:"7px 10px",fontSize:"13px"})},"✕")
      )
    ):null,
    h(Inp,{value:search,onChange:e=>setSearch(e.target.value),placeholder:"🔍 Rechercher...",style:{width:"330px",maxWidth:"100%",marginBottom:"11px"}}),
    produits.length===0?h(EmptyState,{icon:"📦",msg:"Aucun produit"}):
    h('div',{style:card({overflow:"hidden"})},
      h('table',{style:{width:"100%",borderCollapse:"collapse",fontSize:"12px"}},
        h('thead',null,h('tr',{style:{borderBottom:`1px solid ${G.b2}`,background:G.d2}},
          ["Nom","Catégorie","Commandes",""].map(x=>h('th',{key:x,style:tbh},x))
        )),
        h('tbody',null,
          ...filtered.map((p,i)=>{
            const nb=commandes.filter(c=>c.lignes.some(l=>l.produitId===p.id)).length;
            return h('tr',{key:p.id,className:"trh",style:{borderBottom:"1px solid #141420",background:i%2===0?"transparent":"rgba(255,255,255,.01)"}},
              h('td',{style:tbd({fontWeight:500}),onDoubleClick:()=>{setEd(`${p.id}-n`);setEv(p.nom);}},
                ed===`${p.id}-n`?h('input',{className:"ci",value:ev,autoFocus:true,onChange:e=>setEv(e.target.value),onBlur:()=>commit(p.id,"nom"),onKeyDown:e=>{if(e.key==="Enter")commit(p.id,"nom");if(e.key==="Escape")setEd(null);}}):p.nom
              ),
              h('td',{style:tbd({color:G.dim}),onDoubleClick:()=>{setEd(`${p.id}-c`);setEv(p.cat||"");}},
                ed===`${p.id}-c`?h('input',{className:"ci",value:ev,autoFocus:true,onChange:e=>setEv(e.target.value),onBlur:()=>commit(p.id,"cat"),onKeyDown:e=>{if(e.key==="Enter")commit(p.id,"cat");if(e.key==="Escape")setEd(null);}}):p.cat||h('span',{style:{color:"#333"}},"—")
              ),
              h('td',{style:tbd({color:nb>0?G.acL:"#333"})},nb>0?nb+" cmd(s)":"—"),
              h('td',{style:tbd()},h('button',{onClick:()=>{if(!confirm("Supprimer ce produit ?"))return;del(p.id);},style:{background:"none",color:G.mut,border:`1px solid ${G.b1}`,padding:"3px 7px",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}},"✕"))
            );
          }),
          h('tr',{style:{borderTop:`2px solid ${G.b1}`,background:G.d2}},
            h('td',{style:{padding:"9px 12px",fontSize:"11px",color:G.mut}},`${filtered.length} produit(s)`),
            h('td',null),
            h('td',{style:{padding:"9px 12px",color:G.acL,fontWeight:600}},totalCmds>0?totalCmds+" cmd(s) total":"—"),
            h('td',null)
          )
        )
      ),
      h('div',{style:{padding:"6px 12px",borderTop:"1px solid #141420",fontSize:"10px",color:"#333"}},"Double-clic sur un nom ou catégorie pour modifier")
    )
  );
}

// ── RENDER ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(h(App,null));
