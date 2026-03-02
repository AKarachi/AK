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
const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABBoAAADRCAIAAADt3kZsAAA8ZklEQVR42u2dWxacOK+Fq7IyL2BkUCMDRsZ58B8ObYMtWfKV/T30SidVlPFV25al73EcHwAAAAAAAADg8wdVAAAAAAAAAICcAAAAAAAAAEBOAAAAAAAAACAnAAAAAAAAAJATAAAAAAAAAAA5AQAAAAAAAICcAAAAAAAAAEBOAAAAAAAAACAnAAAAAAAAAG/iL6oAAAAAAACAptn3fRiG88/btlkfmOf59lvuJ8dxPB9F4XscBxoAAAAAAABUzu/3syzd0xq+tZWJVvi2bcuyeD4zjuM4jp/Px/+xIOM/WMa6YZom1+5PB0sgQE4AAAAAANRuRhtj9PP5CK1n8yjDtm2WhXrazUGWf5z/67e2JZb07/ej2PFcm3bf92VZctro19rjtuD3+81ZQsgJAAAAAPSP8e64+ni4ZqjHaLu6eQj3tll2pNbrj+O4LAvLOifa5UlJV2yWTbvvO1E4pauHdV2rlRMswYO7EwAAAAAI23NXm/u6wx2EaJQQTUZrO1zLfD8311m6oqxJum3beV4RseVfttisMqsfIBTXEualPEq4LSAnAAAAANtu/vAvI14tlTzuE66nyvn3TyUXWlFxG9tEA11XHkS/4LIs9E3uIn4yLsaJiLXVXZxlWQoWuJKGq1kHsiYKyAkAAAD3pDhbZ+3+erarIzyPo3+L8qM1+JBQbJRKrKj6JaVu73qPfZyowOY0Az0zJyydAzkB+sGzIxi9y1jwXdz7YdYNuWyrXXA7c1mWbDV8Gm3Ba38ZyPniRVq2YKVRep3uKBD2Jdg6PaEuVqGCQFs9jTuhQU6AToRE0Cpqy7X09nUsx4Zt2/KcFFO2bD/8kBrCwtSwE2ws47YcDILdLM9CpTIYq1qJsXvq4fttL+5LN07t0D/qI50e+arpCRZyAkBL3E8BrWw47ftOnDIyzMVEL/A8himxZjJP3BiDKSAuh9M0ack56AFQ3Car2XS+Gsfmz+dF8GulqSRnqIpoJUwXHkSuYXk9nynSbyEnQA+TPn0oNiEnWMEuUr8RsXrzyAms7rpQFqf6h7/WLjLkRIUGWZfWuWuXBzs5sWfqrnFWq7lP9vwNvcy6qJ8pSWbIVy1YkBPgRXLi051raYYwczCwQP0mGqzVPqZolqIL2nnnFR3riJVo6apvP53HHdzHzvOcOR3yR3y8sK5r5iQJViVTOlslA6QPswRyArxLTjR6wU5l9owgW7xLACQoujx1I7FUHnI+x709f01D4YbWPacOVqwCopzgXlgahuFahnmei1i6wrbAVKwLsVv2ZzNATgCAnYD7ye6TLMpTT/6vNdtt3dePG6NMXVQXVxTjP9yyPb0v3SEk/43/4C9e5xx3/rEs+NoGnaKb3zzPxEdVchmDWOAMnrQQaZATANRChXdziyiKFOFKWUcT2dYej3GmW6VPpp61Er9k46r+Lbo8kQk8/XwYhlv721Mk+jZ5fmEPnfxy5Ha27tUsumyrSk5QfoI+u9Y8Kv9gzIDWdxci5jhM/erPzLbHMwzDwYTbPY7jmOd5Xdfbp83/BVqiqnL2amTn39WueZ6E80k3HaD7A3DdGaPmu92QE6Bhoo8mTk/fbuagFJNyNxN9f7G/gPqcUJtsBrC8UWCM0IaAnABvnMTrn3EitjR0DamevMgQXvY9K3Tq0wMYK6DLjt1NmTFCS9UA5AR447DpcsbR3XDCpPwGiEcxbXWG7/eLK1XyRgdV0aK3G/ZxICcA6J/+DA6Tg6JOcQJAzk44jiMURcfk8VZVnwOxR9Moze1QFCkt5AR46YqCAwr/7IkOBooj2UeHHm6RbO4xlK4FOdF996A/sJ4dCkqZi/Q0yAnQKsIB02t8J/mUV/89dQBSjIWa3dNfMirhHgNyjlBWf4tTFJQys96r2mkKeSdycI3fnyI/AOREdLv01xbLsgjTXWELDbxzLBSZDXRj8wOgmH2lyyXSXe9YZxQRGdn92SpT2IRFJAfkxP9sfc+ELokdue/7U7uaX4S6iJ4xVeaR/irfbMpGvxcrdR0AlY+FDIntAOjVQO9yiXTNfZak37bt+/2yzMKkGeKffjF/Tb7a2en3+32/33Ec/T1pWZZo49WjEU0PHsfx+/3CvYQL9vP8812R7wKAiQKARBMsNyNnKxS/qheRb3tZFtwwhJz4fyHB0qOp17xpmiAqYGoUfy/Jd9GBO6bdQEnq3RL9/FWmAuVjzSWFyFbgVmomQlF8Pp9qzbYipXqjnJimidtvtm2bpilpixqHq+/3i6DpKpaNOflp9x2FCjZuNhF2POwEd0y7Pg+S42UAuhwd2QqsuwoT/Yvizg3meeYuu6fZBpvtjXLi9/vFGWoRcUI6ztlcv6lN3Gyo1s4Q9oG4r3esB4irGoZel0DoAvQKQFFZx3FEdIxxHCN2nNOtZUX6Nq5i80w0uqaX+NVt24brgypTA2XUdVnVcReyOzamx3GkvB3kxBOtx3jBneyI4VCzEkBrgkTM82wiOHFXz2mahGEVtQybz+czTZPwaIgbKAhyIomVj7P11GsJ8QOUiA112hny8JHcoBzotECxO1U4oBBGrxs5AVQMlRoW6zoxxxTTNLGGiQn6VMlU6Y9Om2La78TZKY/jGr1thEOoaaf/GtqaNZn2uqxGuIGid2Ho9d24FWrmmnfZi3iEZxuDmPlVesjvH+7ftL5Fta4rKyvF2YGnaerjNgWrLzUsJ0yvNXeXTbjVSqZXXMpJCkuqUZbqjhcV+myukm6igziG0FSNCjzix4LXsuFPX3w4NCon3rATcVpcJybOvsH9G/poqlZ4DMOwris3sosRIR1c0WbNh+3JiX3fp2m6zReRoeUolZtiCt73/TqG3+yXwq1eyizQa33S5wIVKwpxuEER49LkqaUritpWtD6MieKWrsEskSaCpzEVLM5/alQFleoAv9/vtWJ7nmdzUhHRK95jrTUmJ4yKeGrUDFsplJ+QDzl3T936XaRQefksr27iY1cetL7FQB/pVS3wlV/naMIYMpbudTvcRPC8ndY8/wSF1g0p+q25UBHR4uqFqbMX/Wmoc2SLw9XK9GqOKXCD1sIa8NVGVaunx6ILgQ7GiInHAvGs3u5fMXAAhgj009CuX0QkWZOnuPte96eJgWEyWFeyBviLoTKM6Q85fRa7ufrjJzgm3dYZhuHlBxTBgYMNM4gr4ui7TjJmL+Np2jlvZBrfktPPJOk0RXR5iktLWna8ND1Iod86sODpcp1bjOM46Gd0NazmJuEd9zZFi7qaNe3UHiiWG6grz8zoCcFeatI3ndvcJ+k1GCLluvDtu1OiIn6/3w5uEkf0WGwcAtYkI7EmzROSBlJc15Xi5B2XmKUegwbkmbFTtPU1IYD5Q6kr79zf5d5IpjyNOwYriXFsrmhzDdTMRpo1DV5r+/f7WZUvzyxUqZzY972e44jbpei23ovva56iIkMulSJvFzf10zNk95oayewAZRDArSc7AwXnTy3MKA527GhhAzlRG8QZvpKOqpIQoJQNHSdC3BHUxzJhNi9YDWqMtAxpcMZx9Ngz7j/JC1Ods5MJ3JROgKo89mnmqscdq8voT8Hq9XwAp+23/UElPizqGVRoX0pm8sydPL8+qVkR0fd0rieruo2yLAvLA6djrONr7k6lyaln0VPFxgV9MnIi6YWK/GO8LjmRVEjoTjq3xpnWw1U2WsydCo9zc3OTmqR6KfNX31cIbmsPtyZAr32AGNQ7YnrsQE70N6dF3JFbHjiOo9djapWF4zgOelW/RJKZoE/cHii8xFUbtcgJk1ehoa1Nd62q8zQggwguaA2rG0bNHemYxS/aciKOOPosiWUYFMEducSbo+805XMutcb/tkJhPD/QeuP6vVxUoKd5KbWkFtkliciinU5R5K+BKu5OaKVHyTwRXF3tzWWPmhcPo9ba3SqgrH/yDmBOZpurHBNoghLB6XpUzUpJgQ1U0BzEm6PXmRz9XF0MZJtRuZ79XV70ynZzkji4jF30nm2miCvaxjzrIBJMYTnRTZ7FJhYhz33cDuREsCNdkxxJREu1jSu5W+KpNDgQA3X1m21pp4z6ZVnOIqG3W7QV1YMlJ5reXwv25EoGl3qpEl27Vx81XOO2g0gwJeVE5Tv6dNndkIfMNE0tBn3Kef2j0S0rbvQqYqfFZi24dgaW25t136nIYkkcF41OjMBtbnqYnZzGd4aRmP9dWHno3+YHaxzn9n0n1hKrN1aqqY5CpKgLyu+20heTVte2bUdTEA9VVVqf8px6Bsi1tMRpizUQuAOn2i5EH0GVdIAKa6ZI8eimocoT5D+Xrgne0+jyhYxuEOevUhMntMUlppJ5NUXXDa6e0V2FflzGqqIKB2+Zq9ilziVaOUZIXTnmcnZDhyqUAam1j96uvxNxe3WaJuLdL8R9AsWRHxUarwxKb1ePmwxK9Q1iO8aF9nraMKZP1DVs1ausmPRU2WZ81dmRTO6IYFeJM5noQZ9an3wKyAn66U9zZnpZe5r7wGVZmoj4RBnDxIwwFE2vuMDUuULQnQF68nSC19aboUd5goSOmH5L4Zmo6XFj87d4JeuLlk8v61imj7D16Zbmple0P/kHEtb1iF6VLqlf/YqCMlvROxU9GEWLKPp/d5O4VHftBI1CDERTM8RQbER91eVCGTEZKi6CxA7W2QkY8fQv/9palXRRH3FvlxPQEnGzZNJRUbmiIL47fawSUzS023m0hlhnN1NfuysGTqMHq08fVgt9Micar02fSFdiK9OlVLbzrhQ+HW21S+ajxXxyAlpCshCmzhReraJQf3HiLnW7if9UZEB/Lh/wiQfzPHcQ3D2zTihyrKdlKtDN3HEc5bZXlxYOPTgBfXERirdSy5NkEXmDXs0hJ/Z9//1+qUda337e5jZPuvP6ahVFiomj+wMKYaVlSKpas4EC7/m+abp9FbcbiSOiiBmkuMzlNHO7HAvEpZB1+oed5S5VR3I5YYREhhm8p93Hp8E2z/O6rokqM+cpJEiKUAx0Odfj7gQEgMroeButL6ysgf+2M0zdscA6GK/K2MgwJxD7YdM9MLmcwFZfiq6fKHFHbdsz9KuH9GK3njyROPtIJAHsLVC/BdCTYGalr0I/TGeE5FkBOxYtrJwh6JmdkVZOKEaiAO66kmJANmpqj+P4pUG3JMoqK2GQkGiDCcfQb6P+FleflNKd8aYGN4bj1sqq/HD6tqTpGT/gDdHczFlMTlToi9/KEkIsJytAG30uqKThis81ZSd9oXMOawXtQE++yryuqqe1a2J2bKsBV0DSx3X00tPr2RFLxNIjx7zwskrf/EnX/yqc+PozlVKYPtu21XCsVLz/tN5bIsovzzXRwYYTzmdegmSAw6xvUVEQWxxmrrC3069lx02278zv8VI5gZiw2Ui3s1j2jKISOVrQOJb/dESgfRxNgEYFXkTXjT7B68NS6WArndt89GuHmAmFRj+9AiMsjTdca1Y0pbL91t8atCyoc0NimqZSucwq6ULLsjS96LIiC3eWBhv0ZM0kmhA6SJUtfP2m7eZ0bWc8+yMm/9arVGK+W18hDtvoqi4yyUQXVd2sp5//BDukefGnB55fD5tDhzYFDcFg2RoawPQKTz3GjhLUs8YfhaCvSVrP2bZN/pxlWY5aoRsEx8uovGaIfS/zgtVHE1Tb6OmWJ3qL+6fE/H21VD1nWMe53Ux9kLLCf5nSLv/l+rLjOJr/NY9lPbwS2y+iPv+mMECxndYNpXYO6jngqmHjRMI8z/Sb/ejw4G2YgBZwbml0eUq6127kCupZYg3Sr2W3ss5SFML51lw50TTKcqLOzMotDsKqBk+145w7St9pNFCsJZhT4LXQJTd4G61vJ6msDpKRtW0bUVF0X9X904GPE/FdGrrRUduBV+bzbnpLZfiVUu5euue58ofA2QnOTl06O3FdHdSXzoJNUHOjEyskwh+JtcRw5//mnJ2IF9PzWIb01kwxSJuz/fJvgvjL80exFiq30SVyIvONvdoqM3PgPPrxqORXiIGPKlehdCvfv2RiYwW8GRxQVDL551nW6bkRuImYEIfGrWr6yMJK1DQ6zk7TNNU/iqJ7qpGt8zzTszGcDkJxCRwqHFTLsmSL8kTsS/KDUaJn5/f7rdaDdts2Sj34rSUYUqkJhv1tIqwWsbO1qyjojhmv4gwO404U59+fd0+DdbhtWw1d3SiKZVmCLW4SMRGXAGL/qXlNKTuyCsaTLH6HahzHyidYv0OagpxoQkuobBvQe9tZ43EhDiuUE9u27fueYRnImXGCviVJceskllzXcKTX1VPvLWXI0pW21rqbLt6op9uwInTVP4WeAyF6NrgOk9rWznVdK1/OSt1ke+rG59/T7cWcO1NBRUH3Oyho5nYAvZ6zWRq39sCpipsY2upFfdovIKodBTmhNflWewWeu5FgNUA32115loHM1UWUiMF9WVbqxiKG41PxisyerCR9Wlf0ehqMBScBxSnaOApDUbyKquqWbrYWNHM7gBU/jXJ+tW1bipXLnFmZLqo10fklinmRuAXuLO25J6h+nZ31NKmc0PKqPCu0Zr8LYvft1R8gz3yauQMQz2HlH6hhQr+1p+GuWomZjkqQL0Yqs9PLc9tBIXs+GdxQay7ocLauTt/7p3xmGIbjOPzKP+7VhmEw08jVkDv3v4zhfuuJEHfOLzQXz9LWYHyK5ARrR9bfezJse8uLSukrfa9DqQ8o6JvWipuaqdNh1oO786rux9x6HvFP7zcEWoTuJqHSmYkJfbFX3Qd0l1dKFqbmDIBrb7fMfXVdZDSAa4tHz7fZ3M+sElpGPFCQE1ojJ0+f0Nq4enOQHNaltLjqVfwYUBxr7wl9A0eXCi2e/AKGciCpWDCk0itYIYq/1WJWxKdF4Qwno7u9Alu8V+IDxbK8nz1Ytmnl5niweG84Ja85bmD9ViaMBgAqn0yMY8YbTPYK19D8K6lxeSVeoqM8zc0PYDAxsiq8MkS30AB4Iv50QsW6uvU/S7Q7KNE/57l28Bz8DbK7eGiOIr4oWt0SjjSgNvq4pK5rgK7rGhfmu6F3LBLKhqhhjGNMcNXWmk7Nlnmiyfl8LCZ/ADlxY5oLlx8j03Ma35JJ83qu7bmo9x5vkIJ+w+qVnNmNBy7XAHLiasZV+KhzovOsGuqWvTXFWY1i/lLdHvVY7WcBChrBsL8B6FxOyM0vdS0RLJLWz3me8565bxxH9TNQ4vFRir20nOZUJVmcylLkJkb+H23FYUYYVc/d4SYGW6TXT5EEc9eboxnSsxTcw376RcxUAICEckJ+a6JI5iytyx6tmw5aqKf1IYaQS9FzTG5UielDT/xJ7ycUkZOz13nKc94+pJukxJS0uolCjQb2TwWKP/cUycT6oRoOrOZ5VnzxFJvopaoIN0cBACCJnBDu8OUJC5vfrnqbnFB3eTK2lyX/rKpOtG+n4jir3qtrGyb+8nBrbxiGUi+Yefc3aI/CWgUAAPAuOSHf4/erkXTeCIquDrfXJ2re20unKNJZQmclwNgCAAAAAKgWXqDYfd/lRxN+67CJ28wmvlNzxQYAAAAAAKCknJBfhuvGI+htrk3taj8AAAAAAFCLnJCbj13GPtK9Lcoi9f1yAAAAAAAAdOSEPH1pT5vZ19OJdk8qTM7ODjJYAQAAAACA2uWE3Ghu1+x2Dx/c6xPEL+ZRbiyI7wIAAAAAAEC8nJBric5C9KzragLnq3s6ZTsuOH2lzLtcI1aZ/z0crp/BsQYAAAAAwMuhBopNHR+2UVq/CnItv/lz8I10010BAAAAAICmoZ5OCPehl2V5Z/YAXJUGAAAAAACQE1I50fR+dsfhUKF2AAAAAABADjkhoXUPe/j2AAAAAAAAUExOtO7m9P1+IWAAAAAAAACIlBMSl5h6PIUyR19toqiIDwsAAAAAAJLLCYm3EtdgTSc/GvK5ylPU196PBwAAAAAAzcgJGKwR5HF2gksVAAAAAADIIScAAAAAAAAAoGc5Edxr7zKFMy4/AAAAAACAquVEzhvMSdMgdGl5w5cMAAAAAE3w+/2Elt6+799/NBRip3v+Bj/R5aY+AAAAAEAlRvb1f3u92ThNkzEpl2XZti1uP/S6NRz9EFBATnScE7pa9n3HCAEAAAA6lhDbtt3u2Bq7a1mWcRx7MgauL6uiBJZlQVCZZuSEkO/3exwHvWegSSC4AQAAgI6hpMc9RQUsZlA/f/IMGyKSX4ELHQAAAMDC+LInWkCvbu4SrsWbpknFZiiFKT/988uydGPeqGwZb9u2/APe+O+SE3lI2qugVQAAAGRj3/fTbp6mKZ1pa8yycRxTLHNa67LlJNN0m0aUP1HrNCothmGY/wE/DsgJaBU1ECsWAPA2Ina4p2lKGjxQfdE51508C1CKX4lYnoyVOY7j1dx88vZpqEF/v984jlYlm/31w8FswFs12dDLghfyF1UAQB/s+/5kENDv810f0tktQFCVaZW/gxkDXRJSJid59olcA1eXYRjc28am3d19+nEc13W9igdKOqkm7hX8fj9XHpiXfaq3YRjGcbx2A9N1Pd8CLM2JBS6rnICTT/3Ad/C14iHO4PBf7LvuivkXPHn5P0ic8lAzpgm6tBuu/XZZliIdwNjQlfe9qyGeTlpkEC3GMnb/fl1X6wpBRIdvZfm7agn6vDoMg3FFu75v5sCPV1ucdUZEl3luhCujo56eQNzzMhOpv4ckXeNex+GloVBLy7Kke5fgw3V/lPVz0e91gJYRjs3bE3b3sSlKvm3bacSgHT31/9RGTWPttkoeRenS58UA+hB4G1rNIZ/E4tq9ubma2/G45oHrKEX5rjswbwfOOI5Pk7n/k7evY/0u8QnB+nwa8rrWHbBbFnICcgI0bQTo9uoMcuL6E2hHT+V3uc4pviDrUUHD6J1c926Lywminf00R10D/hiD0hxDEevBOgf4/Lu/UbzPX0vl/zrRGLitk4i1I/hzwR+iFNgdp/550iOlnjYXMA9ATuSTE5m3kFkzTv6XAnXKCU+3eeqHtxbVNQZf6v1ptOPb5ISiXuXWFcwIfzUWlxPEAtwa/REnsaeQCO5kS2rGvXudQhOyLI3baV/oMueKsach5qnkp4dYleavUkrrWy2OAwoV/tAd/kBPoGX7a1CPr+o8z7fz+K1faeoYfLjtA4ogvCcgz3Xw+/0isi19v9+nu6TEJ1x/t79mDRrT/nanXEZfliU6qlKG6S4oqNwi0V+HojfWdTVLhvsx94eeVMe57hx3/l3X/6UvTE+3s3BfIgUIFAvAW7g9pkDwQWh+Cfu+mzxoRHvaeikTvLXCTni+12mLW0a8JxfENXfbNE37vpuEA7cNaj5w+5wz39ltIrOzAMGsFNfffWd4lacORk/osSxLuuwfwo56Kxj8JzBEkXO17J++Yv29JQaCP2SOStxnWgX29Fv3tOr8g2eLDRH2k1gYSf2zcy69FTo7RcfeqcqfCtTv7ERv0OI9wV1LCjremNdXd+uy3Lgp/mO3ThcU723zW9dF9OkrT34d5iusSvBcdnz69eBkmNrZyZ0q5ZMq5QIScYOZNVJYPmP+AhccjCrOTtevs/zjXUv3WgBrWEVXUerbaG5tPA1kf4VQRgfxt+g/5K9PT83LLbQMtwRfZ5NATiSVE4neRf5euIb4WjnhX8KvdjDRaHb9UJ++HhHE4wgFD/GX8/pFs/L5g37IdUXQFfu2zP5R7HEdfvqtuImCMovG3Z5MLSeCX79tF5U9oOBVUSK3AWqeSqslJ8oaVVpy4ra/BS8tEAe+u69fm9l63UrwFI91g/m2Ldw8IRGvHH2zXFdOaNl4gConcBW7fjkR7ZqJ3t+TnKA3qH8Xyto6elqcKPcX/fupxG5Pse08UiTnwR2lTuIqx78zRxndrIIRgwhz7eNg/SQyCJ586yl3NG93rKNb0+paQXnjN8vUTycalROe4X+tYU8b+TfXhHepuXKCMsridj1YciKuL93WWPTphJacOKvLEzYaFkVyOdHQpcnXyonoX0Hvh5yI26OKM5q5ckIeqyTbAIz7raBxyZIT15XSsjb8x0eulU85W3DPWG5NbdfuUTwmlawXRIeQ24/dLovBrvuUFsPzGcgJ+bco9qi/EwoDgllfV7FSWGfRTw5g6eSE1oGYXE7QE1DAokguJ452/J1ee3cCcuKdRIe6Yy0q/gh9rsuyvzN74tVSbGvrHgLX+/zpY34X6uhhaN1GoDjbuC9FkXN+PzHiyYO/VxCdHCgGh6LvR4op3fWOEx7xsQ7QWIZXnEldlZw4YnMy6MqJpEsnq8PL5YRnKmZt31QoJ67jkeLb6bG+6BdOAORELXIizz1pyIkXErex586w/g3RoJUfdPj2m0FEJ/unTeKgYR3n4iKXE0/moz8nNPGuMH09Zu2Mej7MSjdG95wuKCeEl8f8LeUKVKJrfrScoJtlkBOZ5cRBvqQh3DziDofm5IRnZyq45/W5JMe4/RiC08hBoNjmeWfgP+CuDcGeME2TO9XSY3j/fj/r69u2uV+f59la/KwojZZD863FH/wVU3IrfDglfvzto9QviT1Fdl/X9VwOPUEMWe3uLwa9cjyt5soJeglzBoFdnnFrRhL3k1UD4zh6RlnxgJWImJmzuuIcyP3D3AQmDoZzeEmyqScRcibH4C58gEgZOXE0dcm7+HhIMT2BLte5r5dbrx7/Mz0m75Npbozm65Oth/jXY9f69M/7rMHy9DoplhZ/6qvbkqgIjCcU33FZFk83KzW3G4X2xHF3L4Ilda7J4PyzrusbVvO80fcKwnIfCv7TsiwRGdCs0yH1wRtsweNfkriChkqp/vz01ki41J6ceApLbOZ3yhHVm3cyAEhtfvk/4znx8H/XDHBzfyDpW1jF8CwS/sVP7th5GxTIpGmr4QjRZGQzmdEoMqC5HZ9gZ751n/D0/N+FpyR0zdnrNTdr6op6GobnTHjrwnH9pziL3H9aq96m/tQiXLM7df/xzI0RshwioVs58eSlEKG/GyXupXB0A1KrXOLSKFzg53kWjmtilgNdiyTuIeu63t76MJcCjcleMAP0mUfvzT1/nmerR902xzRNp6e1vN4SbSqleGxZayx15yzV+YdhsG7IcOuZvh/h3yRieT/mUa1PtbHvu1VCXRMRbh0F5IRkzupDIcC4B91gDCPPeb0/xVu16ohSSPrO4rZtcecJwbiExjb9fr/TNKU+slB8vmQV8H83/7mNe6vV1RL+rh5sZS2vkmA+RExoKss65eKZrhXBVRQqRojkslC6AWg2XKyy7fseHKcR0+B52Oj6K94+31xKMSfMGDKF5UQfhntSh2YIGKA4TR//DTTuJqgOHhdY/6q+8f9pZFsorpDmdjgxEdU4jkmNGE98ISuIbTA8i3s5nh7uQ+j2rY6/PK6WsALCmEEU4UCvXlSguKz7x+z12kycUW4dUNA1zL7vQX0bHFDchySdiG57tQmNsO+7cTJ0zU6iGeYGArleKaRH0b0uf0bwQFEE+Utpnj6s2+i3+P1+0YoCXRBk696mlwrVr7XCpTBouj9lvt56NEf2hicFmK2HnK2Zf4uklQXl2kzjOKrIBq0oXt/v19Nb9n1/Gq3BnOvvdPy4Wpbbthlz022pfd+vFRhdV+u6/n4/Kye0+e84jrc95EkDuBbz+TFjl8u39iVmT9yEf5uZJ6LOTT0/TbnR4wsEQaDY3nZZAFCc+pvTw57T1CLvMgyD2cx+WizTlUpxZnD9E9rt4Z4tYU9E4zytJglT9vTd7/er+KN1qgKtAWIcEX//RbHzz/N8e2b4FCrN/bBRDpZudOM4+6MkU/rG07eIs0owGjjxIeYc1dXJQW9D/ynxmdDTo2GsSoBvYWE50UdKBNjrAESM/XNRlNheRMehp0k/5xpwxgK6nfeMH1RmQ5zrIH5tNU8rBB9lqiLaMyTdcuNah56IxlombB57/TaTBqX+gyeQxlUmc2sW2T052+vJFmdFl3mq7adknRTbel1XtwDDMBDTYPutZ+u+eLA/ex51de66zfpiOeKeISuuv2IyRTwlHTJf95ytGfHmuv6a24PmsWZafkpueA1ACs/DMHGZdOnTaLYspz1lxeb+YuaXAhVmxdZqUHoiUn9eYU+K5eCwZQ1tf3JTfz5glQS9t6/suV3gfztKm0a/lL9gVk3GpSp3P+l+TFjPcR3yaSGjV9dpmjwZptwU6fLU109Lof+yuKfdg+mW1ZMHx01icZmVbxvCNGsKeyaI+k9bDzz/7M6K7rW66z/Fpe4GL+cTMXTTyQmJ41o6OaFr80FOgEblBMvQ95SNKyc8r+ZWgkROCM0mYplZckLFvOM+86n8lFmX0nZac5F81//WnFJ5FP0FJXIirrTc7pRUTtCFgVxR+z9Zdrm8bUr12gYgHX8/Kdm2rR5PoSL+vvC3Az1hnSw/DXDLu8mVKNcbkO4T3BN540ZsHTdbVyS5/iqpK+e2zEF3keM4ro5GKlOoVTDXi8O9tnhr3Lh+BVf3idu7j0R717yy3JOEWy1u3UqO4vP3PfOLL4wEyHLNP3um/5PHcbi5DrLNKimyVgOQldSHBtxTs3SnE6mriOI/kOJHi5y6gHeeTjxdDWR5xbg/4c4ST/FM/PcL3efkPJ0IlvnJQA+2rPWxoP8G0c/HY6slfc7TlFXJaTZl0jbN6hmAHmc/z8/5HcP8x3Sug5Mp5PmBM47QbbOe116D7Z5iNjsdyTCxA9AoyeUEcbWrWU4oevdCToDK5cRBcEYS2pRE73Nu3761hKLlRFx9srYPnubGp4cIy0lsNcqMTbz3ya0o4X0V3fn8Sf4R3dCvd0Ape2pPH+OO8fN31d3fsXAAAErKiU+WawCURULidwQ5Ad4pJ1LYpk/m8u0QJm4VPxlPOU8nrvZccLLiWttWTUbvFnsu6XJt0NtHcfeYPbdCKxllZS+n1jNpx+0PAgAgJ9TkBH2dkFxveG1kJ8gJyImP6qU9+mMpgb2fRvqtJcqdFvy/Yr1O8JNu+EIVSzT6tNYKbog+/8YVuo5J+ylGEAAAGP7SjXVJyAviHSNE9gWAfnUv0WVB+vaBuT7oppUYx9E/lk20b+vi49MrmEjtn7ssY5QZg/46wzAoTkHn60Q3Da5mvpzaEjc9JW8GAACqnJjnWbK7j+zlAKRWFM0Vg2u+w5QBL1ERRma7J5BlxzgGIADgCUZWbOFcJsmMCwAAALyBp3x5Za15aAkAgI6cEPLC2NgAAAAAFlAAAOSEGrV5ggIAAABVcXsOgIyoAICaYWTFlk9nJqoJKh0AAAB44ppinBhyAAAACsI4nRiGQa4ogjcocKTLBS6tAADQE8MwzP+AlgAAdCUnPp/Puq5Cc1+SWQIAAAAAAABQFX+5XxBGjN22bd93bLcAAAAAAADAxXj6SDwhb32FJA/8G/EdSUo78/V1XdEbAAAAAABA5VyTrkbb3MaCt+zncRyXZSE+cN/3ZVmubj7jOLLyS5oX8djw4zjGmegxcmKe5+tFMS44oAAAAAAAAEQL2BjxcutxmibzNKLR/Pv9bo3v8y+J6sL87q1JbBSFXxLs+357e9lY46YwFGUSvAK9bds0TRGK4m9ceyzLIrmWvW0b5AQAAAAAAMuwNn9OFIXlarbSTbUnW9mPx6Z3t+GtL7K25G9fTfheV40RrKhg/Rij+ukhT5LmVpl4Aqg+OThZFbJt2/f7ZQdiPWKR9NdlWZ4eG+1G5Xmm8MmSWor+0QxtcQAAAAAgI0SLhbjQqxfvarTQC6lrDRINJ24dcquOZb+pPEelej3V4vmwW0hu9f6RdAJsFQAAAACgKn53cBPp7vv++/2+DtM00R+17/s0TdevnxbU9/slPmff9/OLFqY8wRD8bZ3A0OUEvSGmaRJaucaV6Ony8NPzrdc5n2BMcHOe4H+I27imJKcMiPMV2rbtOI7zhMcNs8Q+bpKL7AjMcUxDpxOm3nE6AQAA4A0Yh+wr/nXQfH78x9VyYi2gt4vm1X4KlkG+pU0xpMZxDL4X5TnBhxCNRY9ZFW1O0Bsu2vvd/YnbJjOt5jYu8a0jTCCr7dwfcl85+NNPfe/6qOCIuH1l6zPR507WS7EOKEQ2ZQrTP/qGd1I5EXEuCTkBAAA5uW77CW3o6C0kt0jXsslL+LT8s94xeimMXuZUjHi/7ch6L8+jWM9R8dz2PIRlpqsoitRGgr/AbqVZI9Hazg92LffzxLezvkUxvYJ9idjlIqSC9bHgG9EdojLJiWhD1t/8kBN55AQUBQDvNLi1bGV1mziiYE++B/RHnRLCNTvo1j/XRtetN9b7ShxRJPau39glrpVPD4m7B0x8HeuUJu45VkeibDm7L2V9LPgrEXJa61GUZnI77bVaPB2GOJr8nYo4TDzFCEoO4uschEOM4FwUlBPEd3ddnoiN+/cjw6P8QDaEmUAAaNrR9owhKHS2vs77lKedUVZUQqxcY7ZwCRbAjStyOqVQ3pQYV+S6LtCb4/f7nWXjftEfPZ0SC9L/EPNPZoL1V7Jky1+y/p5/zh8s8Sly5Vmfrl3yFIDS6p+nu9Tp5nTtIbcPub1IajWZ9StPUTv9D7GK93mIfe/azdYHzGPPYt8WxnoptzDrurovJZmOUndjq5X9ndYzeC2b5/f7uW9tDW3Ti64FuP3W1eAOfsY4vNHlK9GKu23EYLNqlSR+MtfdIMHpRJHTiQP+Ttgnji1Aol0ozzawfIh59PNpfNCL5JnB6Pup8joUrtPcCmf5SHDnMXptxLnqshZOT2dgvZfusqXrNxIx8IO448KqScr+OnH7nLtP7z6EeDYV9BuJa3H/yQPRl8n/UvQ9csmaovWcCJcerqtVcEBd80KYdwn2IuGkLVkjiG5RlO8+dRX6i8fV0ke9i5SSE8EGgJzoT05YKx/lbhzRNk1tYRdvBaIbpWJLUfYdgs2n4o7Mehrdx1q4+goPGLlKKVo4KU6Y0a4aT3t7XMcnT8kp9rTnUR4zXfFWRuo55FoDbg8h9p+g6iBWst+xhN6L/Nde48xZ6xcpbvcUI5LY94jWZPGFieKbpygnbh2EtCrKbeXgDelERrxrgQfrNvjwOPPgoz6vyQ3ZnuRENkP/hXLiKVGlStXllBPZDgdK6Rmt6N0FJwTJklZKTjz16ohZjlu26KEXJwLdb7mfiXtOXE/oZgjTO5jE8oubAaIL47fwVIy/6IkoqW1dvFPpjiOVOUdxupYv9NyZMHq1Yvny0O2TPx8NEmVnZIErHODDT4fCjUTeB9fg1qlv3UzTxPoJT/RuyWu6T1MplTXzSqK/X4Oac71Q3He5DVVuJuqnIyPPOTP3HEbYOsEjrNv34i5JQcf0D9kd2bp4k2EIZ5i4rj9xWw/0N/WMNauj+p95/VcrD8P1coXkra/hbvPPzNHNeoi9Ja1fV3ngU0OrLDpWCfMs5WcqEnpmjDyWTBU2VYpjLJxOyF+HeyCO04m491Jx5W/rdIIYdS7RtHA9ET4j6lA6P8Uxhu48E3TZd40SYmS9/I3oHrIHA8JIPBBUIrFKZlriYA/2c78nD9engvKoRB0g0QQSfCPjTUd5X09b0K8ZaM1dWlWX4nTi+hyuM71uzej2Jfq7RL9ynJ+kojkn72zcsnlUt+LpBL2W/hRQMGmEV2enE6wtlp4yYqpvhCjWc38HOKyReM0vS9zIcTeSr8E6hmGY53meZ9dZ0/1pd0Fy95LXdXV1grtrZRXsdnt7GAb3giOlSqM33eMa0ZxpBHu1J0bK9Z9u+4PV3JKzaBMLyNPrco7Hax36Y8ikm7qr5br3/1QDwzCs6xqMncWqE3/vsoZkwYUv0V54MPBUUhPo/EV1C80/vausZcXHXZ6Z32qv2wtj27aVGRpFnKTfE9kJdyeKnE7QNwhTtHjNpxOS7T1umYnepbfbV/4YMv6zu2BTEksVfUCRtEGtC9a3VcHa8bU+748EL5w03MuLrE6iezoRV2buZ8ySrx4kJ+k9bOK5TdzOtPVAbjPJB5rEC4A4M7BWk6fOw60ZYZdIl3GC9SLRrxyXHjvucPXJ79SflU/9dMLfkfzpxlPYCfozEcVqZ1kDWsZxW3KC+4uQExGvJn+CSq/I4x0hPxBPKicObzQJ7rJBlxOsiEbEKE9JG5Ri6knkRLT6Yo24669wn098OxWbmBjH1p29b5OdKVpp17QMSf1S5ELIX4cSOfFJE0+TWwaKtyE9Jlh0zcTlNIwzfNMtHNFTQR5nJ+50lFNOHJxAYW3ICYppm8IyhpyAnOBWoLByrI0KVizI299y494Su8H1p9MtGNzqteqHtRzexuqhpyimR3NXnOKFyzm3z9Mj2Ao9ZW8Hl7UzFxejOXrpuj3l8MSKjSjbbZhd+fSrYv0nTV2sG0I6aFhnkxMsE5/e94gHVpRzP6GcEFos/vi5eY4mDubZUcSKluLqIPFqUHDsq5hnnnakN3FFciLoxMYdrirGscS1DnKiOTnxEdxkCo58SkR/v6iI8JKUT8HCpTS1P4+i1UU/nWBF4P6Qo6kmOqAgKhbJ6QRFTuhOlXGTkm4GEmto345u+nXtoKIQDp90SWMkubQoa24wpG+i3sIKTkCf9umSPmJRziwnEhkG3DpXPFbN9qaeURPt6PVJcJ+eXl2Fr2JfcW8xZrhRFPwWNU+4KnmCl+EqdkS1+P/VsxiY66TB1cJs32p1ALrx9FQwK5ZlkeFAb47oCWTfdyuCpPCGIisTHKX/RPP9fs/H+lvQus8aLIxiaZdlyXMlcZ5nSrFv79n7q8IgqaXrWc3tRcnbCAGsQj61tRDrxEm49rnGd7C0KdayaZool3Yor2P1Ac819GEYKHujlYSQUY/iemv/UF6WVSGVhD2gT8VVmUDq/En03HVdM8fNrTOeRp5S1ROiuCzupmyKCmTNd1qrxbZt3+9XMjtYe+e1TUxafdh9tWzCKekPSeRWTjnxyRhXhFJs3cIQH7Wu69kZzthlddqRnrejhGzyPMp9QckDJSW5DXTGHa23Jy2UnsCylLSmQYkVq2gBR0wsLcqJDDbY9x817x3/SffoeZ6RWq5yejrWuM1C5dkCvI5/s95TZgT/zuvtE1jbkNxsZYbrJmieQac7j7u1GvcW7nMKKm3rkES3woNLvlWBnn4bMQkEvcBTV/tTJqlbPyXWUcD1Ggb9UdcIm09Dw1UUccc41wLo1rN1JSP6OW6OSOPlkn8M3mar5M5d5sDTPWIimt0ez1h/JXdgPnFnrdre2iSto8RG93Sq6xvRJ9tr37CGvH8285TkWv/Bq6cxU0FqB/fbzpHoznSiCwaf6u9OSEZ7u3cnbu+bEn1bb10Dg/6C7hp520yUu3rE5nCXoriuSA+0+nS/PCh+oseIysXZ2+cEs/l8+PcKWEGutfzauVer6c7ilPn5mp/B0zTRHZU7jbsN7d5T0upUrAvZESXX9Y1WdHNXvC/BCp6mGBpB5b7E7VwdPUHdhuvwrDvR5k20nZYuplOKb8mfT5/Po0tCvI/kn+SJ3TgYli0iMCC9t+e4jMudjhPJiY6vYke/V09Xsc9OT3nH288E5QS99oKqhr5Euf1WXlcpRl/cSNEKt/Lk7J5ZTqhov+BjiVV0KxX8+lC4yxDXUYW7QvQuoTXVKC4H9cgJlTiht1uzurdviR/W0hKUAE3pat6fEEaxX6lPWRJzn5Lp5RDEaIqTE57+EywJxYj3tyBln5QSBzm44NKDDZSRE9yGx+kE5IRwx91fk0/bAP5eKoyW489zxJpeI3ojfQDKz5olm7UqZy/B1TednIg4RkhxNCFsTa3pjrgUSVaHbM2hlVdEHqcy0QQur6hb3zB1JUN5vtbE4ppWcfkcJG9E7HWSlT1PxgndGU+i8OlfpOQdIuYmoh8afELp8G6fQ+/zTylxuMtoMTlhVRmrCSEnICe4hoU/LvvTF1nhMoXTluRgTSgngsaQUFEQFwz3V7S2D1k7ebpy4kgQTjfuaILYoMZCij7d1jKX45wKPlmSKOva8XXKCfkMI9zFjzs7JfqaxvVn4exEnHKDQy/CQOQ2X7qEOdF91dOCt2tHdGfjBgo3lrf5OXfm9JTkdr17uqN1+xBuDBj5Es/t87kNSkqGL8gJ7i+mq7FG5YR/zX46S1WXE57w8JmtohRWu5btolsqbvrC+uWEvJbOlc9K95bCSJXLCV2nDsUUDf7fNeFlc8oJxY1kRXs0bhef2AGCxrfWnRmivw29SimOl5TbTZR96xoE6iFLtsiNtRj9vtz8qpLLqMTA1vLCUF7qVsZIzYz6zURd47hLOXEgjZ3XXn86uGCJkIiq8xwiF5QTce2u5TeioiVO4zjuOayvlJUTiucGSW1cRTmhe9ndMwbPXhTRbaLNJqGdmuHihGSvN1rxRhjfwTuvWlpC5Y0ofjLECfP6KH9e7bJygn7xI+cO+qGRSzv6ypk/AS6xlhRvvj0to3ED5+8HvJjf71c2zUo6rimHrkH93OtKcQ9/W1dRSaowTdNt+HZWJ3TTY52NEhHYvs58NUlbgdu3z4i327YFCyBMb0LZZ2HtNxEDOE7TFJ0VwZITns6877uwv+UJfEzvZlasW+5YPpnn2eo5bmdzfys4LTxlJLQ60rXMbhuZnD+UbnAtsPVG5iHW31gXcp7awkqf5y+PMOSM7lCVTFzrut6uF/I5P65/nm5Ot29KzAw7DMO6riZcrKVq6APHpLIxD7H0CXf0mUepVRNOJ958OqF776qq04mnf/X0GfrphPyKYXOnE/LgNlr3I+U9mVUb3B/SHV+ShtMqc3RHTeR+oPVh1grimRzoQ0M+iBJN3dGXcRXNCb/TTtClR2IKqzzntt60rJekC3qGTqU4B6r0N8kTOrCdEpEwjR3IvBn/8hoIbmMoVlpbW9qf6Kw0qjXg7vlF7IvcZv7iPkpSA60MtGu+JFYeN39N+p+TPy2mvymt0rpOLPS384wgq8aeavs2pVpnS8mZ82uapq8XSsczOYDN0zLnScyzKtFfx+8kczaccKdZd3I7ExnLY3vcpkI6ZEFoop9gTOde3TpwOoHTichoPB3fnXBd5IOetQUjOwVdFXVPBtT3Drn3JTIkl1C5PhGRuyDd6YSwvYghR/wfoNdVotCNB+fiL+vVnmqJUpO3J2+eVGUfWUo1SaRaxY1krQMB/wC/tXrTFSbFSwWzX9Mr/ClZu6T1TQmbzmkLagBy4qVyQn1BKtN9vTUW7Egsm5t7W5Hli+VvDt1AsdEyMq7/aC1+ilqC3prcjB/BpKTZ5MRBS5VIecHby6D+0I35Y61Ysaroaup2bvQk+3sqHmsGjhgCkjg5rPosKCeO0F1V0zS6hbH66pMytEx5a6ecMtiN1e4GVQMAcgJyoiI5QZ86u9mHoDgis2pYJbflkwXmlxOfxFmxD04szuBL0SM/yDPjeMw1oST2N9CtWZNHtmk97enWoHlT1pERd7dCd19Avkx4Xo3ltufvusRaiuv/6XKNZTuduOo0uuXN/Qp22QGAnICcSC4nWndw8tgBxJRGEjkRFAn0fXSina11fTm1OcLtlssDnkyXEodguR35IQfzrkdOsGSAYnLDCJkXlx2C2IKUbWOKY7rK+hVt7F4t7BQWM7bMAQCQE4zlNu6OQU+nE1113yjLnmi7E/tP8KycqBPcPTz6fjxFKuhauorWHqWBFB8VV0LiwFFMmnYwc5lLplPiw4OPkli6Z9WxnuBRAtyTWFfT+r1r6NY/XFwAAJATBYg2HdJpFcluUD1yojMtcdB8JBRPJ+IU6W3BdPshsefouvWn2xdwSyh8lGS2YRmUumPNCjYvbIun4GbcJ99q3eK2smW+Y2kHAIC3y4kjZZyiOLtEy+QtKCe6XGIlVySDJwb0+PER1R7hdiyshyO7v5PkSMF6X9YxgrvNHDctcHemrz1NS62lCLoC53IAAACvkBNxdj/kRPf3JSLMaFZ4FnoTUDqSiiAhdgbih9/QK2rojagNAAAA76HeNHbzPB+xxxTqSNIz5Um481RRwmwvHTDPsxuV9SkHjeWtHnzsU+Oaf/Jkujm/fvXNMFvRlv89MUfb6ezhL/b1X/MnHXsJreTYAgAAAHSoX/FQwm7UfDoR94vc0wnFEEAtAv8NekW9tpMkJYWnEwAAAIDTCR2GYVjXlS4q3slZOafD96uSwA/DgD5ArKir8hRGTALnOc81KQd6IwAAgFfxp5WCGlEBLwJP/Wzbtm3buq6vEhIgWnkaOQGXJyH7vlt33FEnAAAAICfqxVyoePJZf7lhNAwDtkUBpZ/A/E0kz3A0AQAAAHKiGVExz7Pr/kTZlYfHFADzPONOdgpdsa4r6gEAAADkRDMY96fjEpqd+K2I38pvb0H2gKRcDd9lWfZ9R53EccbmgpYAAADwTv528A5dOvnAZQKk5jiOfd+NGkdtRIOrSgAAAF7O94VJCb7fb4ThFf1zv98vLiUfeicAAAAAAKicP2974SacOuDpBAAAAAAAICf6IefdCVzoBAAAAAAAkBOVYvIz1Ln9jwudAAAAAACgLb6v9dFnXWnYtk1yN9pzW8OUAbc5AQAAAAAA5ETzAuNzyep1/kFu65v4OdZfIuMVAAAAAACAnAAAAAAAAAC8FFzFBgAAAAAAAEBOAAAAAAAAACAnAAAAAAAAAJATAAAAAAAAAMgJAAAAAAAAAICcAAAAAAAAAEBOAAAAAAAAACAnAAAAAAAAAG3yfx/uneCSsU6lAAAAAElFTkSuQmCC";
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
      .header img { height:80px; width:auto; max-width:100%; object-fit:contain; display:block; transform:none; image-rendering:auto; }
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
