"use strict";
/* Vérification CalculZéro — syntaxe + test fonctionnel du thème (DOM factice).
   Aucune dépendance. Lancer : node _cz_verify.js */
const fs=require("fs"),vm=require("vm"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const earlyBlock=blocks[0];
const appBlock=blocks.find(b=>b.includes("use strict"));
let pass=0,fail=0;
function ok(name,cond){ if(cond){pass++;console.log("  ✓ "+name);} else {fail++;console.log("  ✗ "+name);} }

/* ---------- DOM factice minimaliste ---------- */
function makeEl(opts){
  const el={
    _attrs:{},_listeners:{},_classes:new Set(),
    style:Object.assign({setProperty:function(){}},{}),
    dataset:{},children:[],hidden:false,value:"",textContent:"",_innerHTML:"",
    setAttribute(k,v){this._attrs[k]=String(v);if(k==="class")String(v).split(/\s+/).forEach(c=>c&&this._classes.add(c));},
    getAttribute(k){return this._attrs[k]===undefined?null:this._attrs[k];},
    removeAttribute(k){delete this._attrs[k];if(k==="class")this._classes.clear();},
    appendChild(c){this.children.push(c);return c;},
    remove(){},focus(){},
    click(){(this._listeners["click"]||[]).slice().forEach(f=>f.call(this,{}));},
    addEventListener(t,f){(this._listeners[t]=this._listeners[t]||[]).push(f);},
    removeEventListener(){},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    closest(){return null;},
    getBoundingClientRect(){return {top:0,left:0,width:0,height:0};},
  };
  el.classList={
    add:(...cs)=>cs.forEach(c=>el._classes.add(c)),
    remove:(...cs)=>cs.forEach(c=>el._classes.delete(c)),
    toggle:(c,f)=>{const on=f===undefined?!el._classes.has(c):f;on?el._classes.add(c):el._classes.delete(c);return on;},
    contains:c=>el._classes.has(c),
  };
  Object.defineProperty(el,"innerHTML",{get(){return el._innerHTML;},set(v){el._innerHTML=String(v);}});
  if(opts)Object.assign(el,opts);
  return el;
}
/* localStorage factice, partagé entre les "sessions" pour tester la persistance */
const lsData=new Map();
const localStorage={
  getItem:k=>lsData.has(k)?lsData.get(k):null,
  setItem:(k,v)=>{lsData.set(k,String(v));},
  removeItem:k=>lsData.delete(k),
};
function buildEnv(){
  const tb={auto:makeEl({dataset:{themePick:"auto"}}),light:makeEl({dataset:{themePick:"light"}}),dark:makeEl({dataset:{themePick:"dark"}})};
  const byId={};
  const chip=makeEl();chip._classes.add("chip");
  byId.tScore=makeEl();byId.tScore.closest=()=>chip;
  const document={
    documentElement:makeEl(),
    body:makeEl(),
    createElement:t=>makeEl(),
    querySelector(sel){const id=String(sel).replace(/^#/,"");if(byId[id])return byId[id];byId[id]=makeEl();return byId[id];},
    querySelectorAll(sel){
      if(sel===".theme-btn")return [tb.auto,tb.light,tb.dark];
      if(sel===".seg-btn")return [makeEl({dataset:{lvl:"facile"}}),makeEl({dataset:{lvl:"moyen"}}),makeEl({dataset:{lvl:"difficile"}})];
      return [];
    },
  };
  const sandbox={
    document,localStorage,
    setTimeout:(fn,ms)=>0,clearTimeout:()=>{},
    setInterval:()=>0,clearInterval:()=>{}, /* sessions : startFree/startSprint utilisent clearInterval */
    requestAnimationFrame:fn=>0,
    matchMedia:()=>({matches:false,media:""}),
    performance:{now:()=>0},scrollTo:()=>{},
    addEventListener:()=>{},
  };
  sandbox.window=sandbox;
  return {sandbox,document,tb,byId};
}
function runApp(env){
  const ctx=vm.createContext(env.sandbox);
  vm.runInContext(appBlock,ctx);
  return ctx;
}
function savedTheme(){const v=lsData.get("cz_theme");return v==null?null:JSON.parse(v);}

/* ========================================================= */
console.log("\n[1] Syntaxe — compilation des deux blocs <script>");
for(let i=0;i<blocks.length;i++){
  let good=true,msg="";
  try{ new vm.Script(blocks[i]); }catch(e){good=false;msg=e.message;}
  ok("bloc #"+(i+1)+" valide ("+blocks[i].length+" car.)"+(good?"":" — "+msg),good);
}

/* ========================================================= */
console.log("\n[2] Script anti-flash (tête de fichier)");
{
  const el=makeEl();
  vm.runInContext(earlyBlock,vm.createContext({localStorage:{getItem:()=>"\"dark\"",setItem:()=>{},removeItem:()=>{}},document:{documentElement:el}}));
  ok("cz_theme=\"dark\" → data-theme=\"dark\"",el.getAttribute("data-theme")==="dark");
  const el2=makeEl();
  vm.runInContext(earlyBlock,vm.createContext({localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},document:{documentElement:el2}}));
  ok("cz_theme absent → pas d'attribut (auto)",el2.getAttribute("data-theme")===null);
}

/* ========================================================= */
console.log("\n[3] Charge initiale — thème par défaut (aucun choix sauvegardé)");
lsData.clear();
{
  const env=buildEnv();runApp(env);
  ok("data-theme absent par défaut (auto)",env.document.documentElement.getAttribute("data-theme")===null);
  ok("bouton « Auto » marqué actif",env.tb.auto.classList.contains("on")===true);
  ok("boutons Clair/Sombre non actifs",env.tb.light.classList.contains("on")===false&&env.tb.dark.classList.contains("on")===false);
  ok("choix persisté = auto",savedTheme()==="auto");
}

/* ========================================================= */
console.log("\n[4] Clic sur les boutons — application + persistance");
{
  const env=buildEnv();runApp(env);
  const doc=env.document.documentElement;
  env.tb.dark.click();
  ok("clic Sombre → data-theme=\"dark\"",doc.getAttribute("data-theme")==="dark");
  ok("clic Sombre → sauvegardé « dark »",savedTheme()==="dark");
  ok("clic Sombre → bouton Sombre actif, autres non",env.tb.dark.classList.contains("on")&&env.tb.auto.classList.contains("on")===false&&env.tb.light.classList.contains("on")===false);

  env.tb.light.click();
  ok("clic Clair → data-theme=\"light\"",doc.getAttribute("data-theme")==="light");
  ok("clic Clair → sauvegardé « light »",savedTheme()==="light");
  ok("clic Clair → bouton Clair actif",env.tb.light.classList.contains("on")===true&&env.tb.dark.classList.contains("on")===false);

  env.tb.auto.click();
  ok("clic Auto → attribut retiré",doc.getAttribute("data-theme")===null);
  ok("clic Auto → sauvegardé « auto »",savedTheme()==="auto");
}

/* ========================================================= */
console.log("\n[5] Rechargement — le choix sauvegardé est réappliqué");
{
  lsData.clear();lsData.set("cz_theme",JSON.stringify("dark")); /* dernière préférence = sombre */
  const env=buildEnv();runApp(env);
  ok("recharge : data-theme=\"dark\" restauré",env.document.documentElement.getAttribute("data-theme")==="dark");
  ok("recharge : bouton Sombre actif",env.tb.dark.classList.contains("on")===true);
}

/* ========================================================= */
console.log("\n[6] Fumigène — confetti() ne plante pas");
{
  const env=buildEnv();runApp(env);
  let threw=false;
  try{ if(typeof env.sandbox.confetti!=="function")throw new Error("confetti() introuvable");
       env.sandbox.confetti(); }
  catch(e){threw=true;console.log("      ("+e.message+")");}
  ok("confetti() est défini et exécute sans erreur",threw===false);
  ok("les confettis sont attachés au <body>",env.document.body.children.length>=1);
}

/* ========================================================= */
console.log("\n=====================================");
/* ========================================================= */
console.log("\n[7] Générateurs — forme des questions, visuels SVG, round-trip localStorage");
{
  lsData.clear();
  const env=buildEnv();
  const ctx=runApp(env);
  /* Les registres et fonctions sont des const du scope global : on passe
     par runInContext (elles ne sont PAS des propriétés de sandbox). */
  const probe=vm.runInContext("({SUBJECTS_MATH,SUBJECTS_PC,checkAnswer,VIZdraw})",ctx);
  ok("SUBJECTS_MATH, SUBJECTS_PC, checkAnswer et VIZdraw accessibles",!!(probe.SUBJECTS_MATH&&probe.SUBJECTS_PC&&probe.checkAnswer&&probe.VIZdraw));
  let bad=0,vzbad=0,rtbad=0,checked=0,vizCount=0;
  const REGISTERS=[].concat(probe.SUBJECTS_MATH||[],probe.SUBJECTS_PC||[]);
  for(const sub of REGISTERS){
    for(const g of sub.gens){
      for(let i=0;i<25;i++){
        let q;
        try{q=g.make();}
        catch(e){bad++;console.log("      make() plante "+sub.id+" "+g.lvl+": "+e.message);continue;}
        checked++;
        if(typeof q.prompt!=="string"||!q.prompt||typeof q.explain!=="string"){bad++;console.log("      prompt/explain manquant : "+sub.id);continue;}
        if(q.type==="choice"){
          if(!Array.isArray(q.options)||q.options.length<2||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.options.length){
            bad++;console.log("      choix invalide : "+sub.id+" "+JSON.stringify(q.options));}
        }else if(q.type==="frac"){
          if(!q.answer||!isFinite(q.answer.n)||!isFinite(q.answer.d)||q.answer.d===0){bad++;console.log("      fraction invalide : "+sub.id);continue;}
          if(probe.checkAnswer(q,q.answer.n+"/"+q.answer.d)!==true){bad++;console.log("      checkAnswer rejette sa propre réponse (frac) : "+sub.id);}
          if(probe.checkAnswer(q,String(q.answer.n/q.answer.d))!==true){bad++;console.log("      checkAnswer rejette la forme décimale : "+sub.id);}
        }else if(q.type==="number"){
          if(!isFinite(q.answer)){bad++;console.log("      number invalide : "+sub.id);continue;}
          if(probe.checkAnswer(q,String(q.answer))!==true){bad++;console.log("      checkAnswer rejette sa propre réponse (number) : "+sub.id);}
        }else{bad++;console.log("      type inconnu : "+q.type);}
        if(q.viz){
          vizCount++;
          let vq="",vc="";
          try{vq=probe.VIZdraw(q.viz,"q");vc=probe.VIZdraw(q.viz,"c");}
          catch(e){vzbad++;console.log("      VIZdraw plante : "+sub.id+" "+e.message);continue;}
          if(typeof vq!=="string"||typeof vc!=="string"){vzbad++;console.log("      VIZdraw renvoie un non-string : "+sub.id);}
          else if(q.viz.kind!=="var"&&(vq.indexOf("<svg")===-1||vc.indexOf("<svg")===-1)){
            vzbad++;console.log("      VIZdraw sans <svg> : "+sub.id+" kind="+q.viz.kind);}
          /* Round-trip localStorage : exactement ce que fait le mode révision
             après un rechargement — détecte les fonctions/undefined dans les specs. */
          try{
            const q2=JSON.parse(JSON.stringify(q));
            const vc2=probe.VIZdraw(q2.viz,"c");
            if(q.viz.kind!=="var"&&vc2.indexOf("<svg")===-1){rtbad++;console.log("      round-trip : viz cassé après JSON : "+sub.id);}
            if(q.type==="frac"&&probe.checkAnswer(q2,q2.answer.n+"/"+q2.answer.d)!==true){rtbad++;console.log("      round-trip : checkAnswer cassé : "+sub.id);}
          }catch(e){rtbad++;console.log("      round-trip plante : "+sub.id+": "+e.message);}
        }
      }
    }
  }
  ok("tous les générateurs produisent des questions valides ("+checked+" générées, "+REGISTERS.length+" thèmes)",bad===0);
  ok("tous les visuels se dessinent en phase question ET correction ("+vizCount+" questions visuelles)",vzbad===0);
  ok("questions + visuels survivent au round-trip localStorage (mode révision)",rtbad===0);
}

/* ========================================================= */
console.log("\n[8] Bascule de matière — les stats maths doivent rester intactes");
{
  lsData.clear();
  const mathsSeed={ans:12,good:9,bestStreak:4,bestSprint:80,bySub:{deriv:{ans:5,good:4}},skips:2,streakBySub:{deriv:3},history:[{s:"deriv",l:"facile",o:1},{s:"deriv",l:"moyen",o:0}],review:[]};
  lsData.set("cz_stats",JSON.stringify(mathsSeed));
  const env=buildEnv();
  const ctx=runApp(env);
  const mathsBefore=lsData.get("cz_stats");
  const api=vm.runInContext("({setMatiere,startFree,statsNow:()=>stats,okAns:()=>afterAnswer(true,state.q,'')})",ctx);
  api.setMatiere("pc");
  ok("cz_subject persisté = pc",lsData.get("cz_subject")==='"pc"');
  api.startFree();
  api.okAns(); /* répond « juste » à la question PC courante */
  const pcRaw=lsData.get("cz_stats_pc");
  ok("cz_stats (maths) bit-à-bit inchangé après la réponse PC",lsData.get("cz_stats")===mathsBefore);
  ok("cz_stats_pc existe et a été incrémenté (1 réponse, 1 bonne)",pcRaw&&JSON.parse(pcRaw).ans===1&&JSON.parse(pcRaw).good===1);
  api.setMatiere("maths");
  ok("retour maths : stats restaurées à l'identique (deep-compare)",JSON.stringify(api.statsNow())===JSON.stringify(mathsSeed));
  ok("cz_stats (maths) toujours bit-à-bit inchangé",lsData.get("cz_stats")===mathsBefore);
}

/* ========================================================= */
console.log("\n[9] Bascule de matière — câblage (régression : <html> jamais ciblé)");
{
  /* État réel reproduit : page ouverte en PC → l'anti-flash a posé
     data-mat="pc" sur <html>. Un sélecteur [data-mat] (sans .seg-btn)
     inclurait <html> dans querySelectorAll et lui attacherait un listener
     click : tout clic « Maths » rebasculait alors sur PC par bulle d'événement.
     Le DOM factice ne simule pas la bulle — c'est pour ça que l'assertion
     porte sur le listener lui-même, pas sur le comportement en cascade. */
  lsData.clear();
  lsData.set("cz_subject","\"pc\""); /* page ouverte en PC */
  const env=buildEnv();
  const doc=env.document.documentElement;
  doc.setAttribute("data-mat","pc"); /* ce que l'anti-flash fait au chargement */
  const segM=makeEl({dataset:{mat:"maths"}});segM._classes.add("seg-btn");
  const segP=makeEl({dataset:{mat:"pc"}});segP._classes.add("seg-btn");
  const qsa0=env.document.querySelectorAll;
  env.document.querySelectorAll=function(sel){
    if(sel==="[data-mat]")return [doc,segM,segP]; /* = comportement du navigateur réel */
    if(sel===".seg-btn[data-mat]")return [segM,segP];
    return qsa0.call(this,sel);
  };
  env.sandbox.matchMedia=q=>({matches:q.indexOf("reduce")!==-1,media:q}); /* reduced-motion → swap synchrone, assertable */
  const ctx=runApp(env);
  ok("état initial = pc (page ouverte en PC)",vm.runInContext("state.matiere",ctx)==="pc");
  ok("bouton « Maths » a un listener click",Array.isArray(segM._listeners["click"])&&segM._listeners["click"].length===1);
  ok("bouton « Physique-Chimie » a un listener click",Array.isArray(segP._listeners["click"])&&segP._listeners["click"].length===1);
  ok("<html> n'a AUCUN listener click (sélecteur [data-mat] trop large)",!(doc._listeners["click"]&&doc._listeners["click"].length>0));
  /* Le timer de retrait de boot (2800 ms) ne « fire » jamais dans le DOM factice
     (setTimeout stub) : on simule manuellement le retrait post-chargement,
     sinon l'assertion ci-dessous passerait même si swap() ne ré-armed rien. */
  doc._classes.delete("boot");
  ok("pré-condition : boot retiré après le chargement (état simulé)",!doc._classes.has("boot"));
  segM.click();
  ok("clic « Maths » → state.matiere = maths",vm.runInContext("state.matiere",ctx)==="maths");
  ok("clic « Maths » → data-mat retiré de <html> (violet désactivé)",doc.getAttribute("data-mat")===null);
  ok("clic « Maths » → cascade d'arrivée réarmée (html.boot, animation de chargement rejouée)",doc._classes.has("boot"));
}

/* ========================================================= */
console.log("\n[10] Bascule EN PLEINE cascade — animation UNIQUE (seule la dernière survit)");
{
  /* Scénario réel : bascule de matière peu après le chargement, alors que la
     cascade initiale (classe boot + timer de retrait 2800 ms) est ENCORE en
     cours. Contrairement à [9], on ne simule PAS « boot retiré » avant le
     clic : l'état réel (boot active) est conservé. Avant le fix :
       (a) classList.add("boot") était un no-op (classe déjà présente)
           → la cascade ne se rejouait pas ;
       (b) le timer ANONYME du premier chargement, jamais annulé, retirait
           boot à T+2800 ms et coupait la « nouvelle » cascade.
     D'où l'animation « différente selon l'intervalle » de la bascule. */
  lsData.clear();
  lsData.set("cz_subject","\"pc\""); /* page ouverte en PC */
  const env=buildEnv();
  const doc=env.document.documentElement;
  doc.setAttribute("data-mat","pc");
  const segM=makeEl({dataset:{mat:"maths"}});segM._classes.add("seg-btn");
  const segP=makeEl({dataset:{mat:"pc"}});segP._classes.add("seg-btn");
  const qsa0=env.document.querySelectorAll;
  env.document.querySelectorAll=function(sel){
    if(sel===".seg-btn[data-mat]")return [segM,segP];
    return qsa0.call(this,sel);
  };
  env.sandbox.matchMedia=q=>({matches:q.indexOf("reduce")!==-1,media:q}); /* swap synchrone, assertable */
  /* Timers SUIVIS (annulables) : le stub de buildEnv ((fn,ms)=>0) ne permet
     ni d'annuler un timer ni de « faire avancer le temps » pour exécuter les
     callbacks. */
  const timers=new Map();let tid=0;
  env.sandbox.setTimeout=(fn,ms)=>{timers.set(++tid,{fn,ms,cancelled:false});return tid;};
  env.sandbox.clearTimeout=id=>{const t=timers.get(id);if(t)t.cancelled=true;};
  /* Journal des opérations de classe sur <html> : le retrait PUIS réajout de
     « boot » est la seule façon de redémarrer l'animation CSS. */
  const log=[];
  const cAdd=doc.classList.add,cRemove=doc.classList.remove;
  doc.classList.add=(...cs)=>{log.push(["add",...cs]);return cAdd(...cs);};
  doc.classList.remove=(...cs)=>{log.push(["remove",...cs]);return cRemove(...cs);};
  const ctx=runApp(env);
  ok("première visite : boot active + 1 timer de retrait (2800 ms) armé",
     doc._classes.has("boot")&&[...timers.values()].some(t=>t.ms===2800&&!t.cancelled));
  const armedBefore=new Set(timers.keys()); /* timers armés AVANT le clic */
  segM.click();
  ok("clic « Maths » → matière basculée",vm.runInContext("state.matiere",ctx)==="maths");
  const ri=log.findIndex(e=>e[0]==="remove"&&e[1]==="boot");
  ok("cascade REJOUÉE : boot retirée puis réajoutée (animation CSS redémarrée)",
     ri!==-1&&log.slice(ri+1).some(e=>e[0]==="add"&&e[1]==="boot"));
  ok("UN SEUL timer de retrait boot vivant (le précédent est annulé)",
     [...timers.values()].filter(t=>t.ms===2800&&!t.cancelled).length===1);
  /* Fait « avancer le temps » jusqu'au T+2800 ms du PREMIER chargement : si le
     timer anonyme n'avait pas été annulé, il retire boot ici et coupe la
     nouvelle cascade (les éléments non encore révélés apparaissent d'un coup). */
  for(const id of armedBefore){const t=timers.get(id);if(t.ms===2800&&!t.cancelled)t.fn();}
  ok("T+2800 ms du chargement : boot toujours présente (cascade non coupée)",doc._classes.has("boot"));
}

/* ========================================================= */
console.log("\n[11] Bascule — PAS de temps mort : swap IMMÉDIAT au clic");
{
  /* Avant le fix : hors prefers-reduced-motion, la bascule attendait la phase
     de sortie « home-out » (230 ms) avant de swaper — un « temps mort » entre
     le clic et le déclenchement de la cascade. Après le fix : le swap (et
     donc rearmBoot) se joue SYNCHRONEMENT au clic, reduced ou non.
     Ici matchMedia = défaut de buildEnv (matches:false → NON reduced) : sur le
     vieux code, le setTimeout(…,230) est stubbé (ne fire jamais) → le swap
     n'est jamais exécuté → data-mat reste « pc » et home-out est posé. */
  lsData.clear();
  lsData.set("cz_subject","\"pc\"");
  const env=buildEnv(); /* matchMedia par défaut : matches:false (non reduced) */
  const doc=env.document.documentElement;
  doc.setAttribute("data-mat","pc");
  const segM=makeEl({dataset:{mat:"maths"}});segM._classes.add("seg-btn");
  const segP=makeEl({dataset:{mat:"pc"}});segP._classes.add("seg-btn");
  const qsa0=env.document.querySelectorAll;
  env.document.querySelectorAll=function(sel){
    if(sel===".seg-btn[data-mat]")return [segM,segP];
    return qsa0.call(this,sel);
  };
  const ctx=runApp(env);
  segM.click();
  ok("clic (non reduced) → swap SYNCHRONE : matière basculée immédiatement",vm.runInContext("state.matiere",ctx)==="maths");
  ok("clic (non reduced) → data-mat retiré immédiatement (pas d'attente 230 ms)",doc.getAttribute("data-mat")===null);
  ok("clic (non reduced) → cascade réarmée immédiatement (boot active)",doc._classes.has("boot"));
  const homeEl=env.byId.home;
  ok("plus de classes home-out/home-in sur #home (chorégraphie de sortie supprimée)",
     !homeEl||(homeEl._classes.has("home-out")===false&&homeEl._classes.has("home-in")===false));
}

console.log("=====================================");
console.log(fail===0?("TOUS LES TESTS PASSENT ✔  ("+pass+")"):(fail+" ÉCHEC(S) — "+pass+" OK"));
process.exit(fail===0?0:1);
