(function(){
'use strict';
var XOF=655.957,KEY='moneyreset.v2';
var SPEND=['needs','wants','culture','extra','family'];
var CATS=SPEND.concat(['save','invest']);
var CEMO={needs:'🛒',wants:'🍜',culture:'🎭',extra:'⚡',family:'🌍',save:'🐷',invest:'📈',inc:'💰',tr:'🔁'};
var CCOL={needs:'#2F6FB0',wants:'#F28C28',culture:'#7C6BB5',extra:'#4FA3C7',family:'#E8B23A',save:'#1F9E7A',invest:'#8E5BA8'};
var SENDS=['mobile','bank','cash'],SUBS=['mobile','bank','cash','other'];
var POSTG={
  needs:[['g_housing',['rent','charges','mobile','homeIns','energy','internet']],['g_taxes',['taxIncome','taxHab','taxProp','cfe','taxOther']],['g_transport',['car','transit','carIns','fuel','carMaint']],['g_food',['groceries','market']],['g_kids',['canteen','school','supplies','parcel','childcare','bankFees','kidsOther']],['g_health',['doctor','barber','pharmacy','mutual']],['g_justice',['lawyer','alimony','judgment','justOther']]],
  wants:[['g_fun',['outings','travel','restaurants','gifts','cleaner','events','tobacco','shopping','dryclean','gym','media','hobbies']],['g_pets',['petFood','vet','grooming','petToys']],['g_child2',['famCover','nursery']]],
  save:[['g_safe',['livretA','ldd','livretJ','csl','livretEp','emergency']],['g_home',['repairs','appliances','checking']]],
  invest:[['g_invest',['pea','lifeIns','per','rentalInv']]]
};
var INCP=['sal1','sal2','rentInc','capital','otherInc'];
function postList(mode,cat){var o=[];if(mode==='inc')return INCP.slice();(POSTG[cat]||[]).forEach(function(g){o=o.concat(g[1]);});return o;}
function postOk(mode,cat,p){return p&&postList(mode,cat).indexOf(p)>=0?p:'';}
var CURS=['EUR','USD'];
var ATYPES=['bank','card','savings','invest','cash','momo','loan'];
var AEMO={bank:'🏦',card:'💳',savings:'🐷',invest:'📈',cash:'💵',momo:'📱',loan:'🏠'};
var ACOL={bank:'#2F6FB0',savings:'#E8B23A',invest:'#7C6BB5',cash:'#4FA3C7',momo:'#F28C28',card:'#8A7F6F',loan:'#B33A2B'};
var LIQ=['bank','cash','momo','card'];
var MAIN=['home','goals','cal','stats','send'];
var NAVEMO={home:'🏠',goals:'🎯',tx:'💸',cal:'📅',stats:'📊',send:'🌍'};
var ECB='https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.fr.html';

/* ---------- helpers ---------- */
var S,memOnly=false;
function $(id){return document.getElementById(id);}
function guessLang(){var l=(navigator.language||'fr').toLowerCase();return l.indexOf('en')===0?'en':'fr';}
function t(k){var d=(window.I18N||{})[S&&S.lang]||window.I18N.fr;return d[k]!==undefined?d[k]:(window.I18N.fr[k]!==undefined?window.I18N.fr[k]:k);}
function loc(){return S.lang==='fr'?'fr-FR':'en-GB';}
function pad(n){return n<10?'0'+n:''+n;}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function ym(d){return d.getFullYear()+'-'+pad(d.getMonth()+1);}
function uid(){return Math.random().toString(36).slice(2,9);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function num(s){var n=parseFloat(String(s==null?'':s).replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:0;}
function sum(a,f){var s=0;for(var i=0;i<a.length;i++)s+=f(a[i]);return s;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function dim(k){var p=k.split('-');return new Date(+p[0],+p[1],0).getDate();}
function pd(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function acc(id){for(var i=0;i<S.accounts.length;i++)if(S.accounts[i].id===id)return S.accounts[i];return null;}


/* ---------- cloud auth + sync (active only when config.js defines MR_CFG) ---------- */
var CFG=window.MR_CFG||{};
var AUTH={session:null,guest:false,msg:'',busy:false,mode:'in',sync:'',timer:null};
try{AUTH.session=JSON.parse(localStorage.getItem('moneyreset.auth')||'null');AUTH.guest=localStorage.getItem('moneyreset.guest')==='1';}catch(eA){}
function cloud(){return !!(CFG.url&&CFG.key);}
function needGate(){return cloud()&&!AUTH.session&&!AUTH.guest;}
function authSave(){try{if(AUTH.session)localStorage.setItem('moneyreset.auth',JSON.stringify(AUTH.session));else localStorage.removeItem('moneyreset.auth');}catch(e){}}
function api(path,opt,tok){
  opt=opt||{};var h={apikey:CFG.key,'Content-Type':'application/json'};if(tok)h.Authorization='Bearer '+tok;if(opt.prefer)h.Prefer=opt.prefer;
  return fetch(CFG.url+path,{method:opt.method||'GET',headers:h,body:opt.body?JSON.stringify(opt.body):undefined}).then(function(r){
    return r.text().then(function(tx){var j=null;try{j=tx?JSON.parse(tx):null;}catch(e){}if(!r.ok)throw {status:r.status,body:j};return j;});});
}
function setSession(j){AUTH.session={access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000-60000,uid:j.user&&j.user.id,email:j.user&&j.user.email,created:(j.user&&j.user.created_at)||(AUTH.session&&AUTH.session.created)||''};authSave();}
function token(){
  if(!AUTH.session)return Promise.reject(new Error('nosession'));
  if(Date.now()<AUTH.session.exp)return Promise.resolve(AUTH.session.access);
  return api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:AUTH.session.refresh}}).then(function(j){setSession(j);return AUTH.session.access;});
}
function setSyncLbl(){var el=$('syncl');if(el)el.textContent=t('sync_'+(AUTH.sync||'ok'));}
function push(){if(!cloud()||!AUTH.session)return;clearTimeout(AUTH.timer);AUTH.sync='saving';setSyncLbl();AUTH.timer=setTimeout(doPush,1200);}
function doPush(){
  token().then(function(tk){return api('/rest/v1/mr_data?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:AUTH.session.uid,data:S,updated_at:new Date().toISOString()}},tk);})
    .then(function(){AUTH.sync='ok';setSyncLbl();}).catch(function(){AUTH.sync='err';setSyncLbl();});
}
function pull(){
  return token().then(function(tk){return api('/rest/v1/mr_data?select=data&limit=1',{},tk);}).then(function(rows){
    if(rows&&rows[0]&&rows[0].data&&rows[0].data.v===2){S=rows[0].data;fixShape();try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}AUTH.sync='ok';}
    else{if(S.demo)S=blankState(S.lang,S.disp,S.rates);fixShape();save();AUTH.sync='saving';}
  }).catch(function(){AUTH.sync='err';}).then(function(){AUTH.pulled=true;});
}
function authMsg(e){
  var b=e&&e.body||{},m=String(b.msg||b.error_description||b.message||b.error||'').toLowerCase();
  if(!e||e.status===undefined)return t('authNet');
  if(m.indexOf('invalid login')>=0||m.indexOf('invalid_credentials')>=0)return t('authBad');
  if(m.indexOf('already')>=0)return t('authExists');
  if(m.indexOf('password')>=0)return t('authWeak');
  if(m.indexOf('email')>=0)return t('authMail');
  return t('authBad');
}

/* ---------- state ---------- */
function blankState(lang,disp,rates){return {v:2,lang:lang,disp:disp||'EUR',demo:false,rates:rates||{usd:1.12,updated:null},accounts:[],tx:[],rec:[],goals:[],trips:[],oblig:[],varPlan:0,env:{},months:{},learn:{},rule:{n:50,w:30,s:20},ruleHist:[],objDone:false,sendAlloc:'',learnAcc:{},remind:{days:2}};}
function blankMonth(){return {saving:0,sendMin:0,sendMax:0,plan:{mobile:0,bank:0,cash:0},reflection:''};}
function load(){try{var r=localStorage.getItem(KEY);if(r){var o=JSON.parse(r);if(o&&o.v===2)return o;}}catch(e){memOnly=true;}return null;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){memOnly=true;}push();}
function fixShape(){
  var hadObj=S.objDone!==undefined,b=blankState('fr');Object.keys(b).forEach(function(k){if(S[k]===undefined)S[k]=b[k];});
  if(!hadObj&&(S.tx.length||S.accounts.length||S.rec.length||S.demo))S.objDone=true;
  if(!(S.remind&&S.remind.days>0))S.remind={days:2};if(!Array.isArray(S.ruleHist))S.ruleHist=[];if(!Array.isArray(S.events))S.events=[];if(!S.notified)S.notified={};
  if(CURS.indexOf(S.disp)<0)S.disp='EUR';if(S.lang!=='fr'&&S.lang!=='en')S.lang='fr';
  var R=S.rule;if(!R||!(R.n>=0)||!(R.w>=0)||!(R.s>=0)||R.n+R.w+R.s!==100)S.rule={n:50,w:30,s:20};
  migXof();migRecFrom();
}
function migRecFrom(){
  var all=S.tx.map(function(x){return x.date.slice(0,7);}).sort()[0]||ym(new Date());
  S.rec.forEach(function(r){
    if(r.from)return;
    var own=S.tx.filter(function(x){return x.recId===r.id;}).map(function(x){return x.date.slice(0,7);}).sort()[0];
    r.from=own||all;
  });
}
function migXof(){
  var r2=function(v){return Math.round(v/XOF*100)/100;};
  S.accounts.forEach(function(a){if(a.cur==='XOF'){a.open=r2(a.open);a.cur='EUR';}});
  S.tx.forEach(function(x){if(x.cur==='XOF'){x.amt=Math.round(x.eur*100)/100;x.cur='EUR';}});
  S.rec.forEach(function(x){if(x.cur==='XOF'){x.amt=r2(x.amt);x.cur='EUR';}});
  S.goals.forEach(function(g){if(g.cur==='XOF'){g.target=r2(g.target);g.current=r2(g.current);g.monthly=r2(g.monthly);g.cur='EUR';}});
  S.trips.forEach(function(g){if(g.cur==='XOF'){g.budget=r2(g.budget);g.cur='EUR';}});
  S.oblig.forEach(function(g){if(g.cur==='XOF'){g.amt=r2(g.amt);g.cur='EUR';}});
}
function toEur(a,c){if(c==='EUR')return a;if(c==='XOF')return a/XOF;return a/S.rates.usd;}
function fromEur(e,c){if(c==='EUR')return e;if(c==='XOF')return e*XOF;return e*S.rates.usd;}
function mkTx(date,type,amt,cur,cat,note,accId,extra){
  var x={id:uid(),type:type,date:date,amt:amt,cur:cur,eur:toEur(amt,cur),cat:cat||'',sub:'',note:note||'',fee:0,acc:accId||'',to:'',trip:null,pay:'',status:'done',recId:null,post:''};
  if(extra)Object.keys(extra).forEach(function(k){x[k]=extra[k];});return x;
}
function demo(){
  var now=new Date(),cur=ym(now),day=now.getDate(),first=cur+'-01';
  S=blankState(guessLang(),'EUR');S.demo=true;S.objDone=true;
  function d(n){return cur+'-'+pad(Math.min(n,day));}
  var a1={id:'a1',name:'Compte courant',type:'bank',cur:'EUR',open:2150,since:first};
  var a2={id:'a2',name:'Livret A',type:'savings',cur:'EUR',open:3200,since:first};
  var a3={id:'a3',name:'Mobile money',type:'momo',cur:'EUR',open:130,since:first};
  var a4={id:'a4',name:'Prêt auto',type:'loan',cur:'EUR',open:-6400,since:first};
  S.accounts=[a1,a2,a3,a4];
  S.rec=[
    {id:'r1',type:'inc',name:'Salaire',amt:2400,cur:'EUR',day:28,cat:'',sub:'',acc:'a1'},
    {id:'r2',type:'exp',name:'Loyer',amt:850,cur:'EUR',day:5,cat:'needs',sub:'',acc:'a1'},
    {id:'r3',type:'exp',name:'Transport',amt:86,cur:'EUR',day:1,cat:'needs',sub:'',acc:'a1'},
    {id:'r4',type:'exp',name:'Téléphone et internet',amt:35,cur:'EUR',day:12,cat:'needs',sub:'',acc:'a1'},
    {id:'r5',type:'exp',name:'Assurances',amt:45,cur:'EUR',day:15,cat:'needs',sub:'',acc:'a1'},
    {id:'r6',type:'exp',name:'Envoi mensuel famille',amt:150,cur:'EUR',day:10,cat:'family',sub:'mobile',acc:'a1'}];
  S.rec.forEach(function(r){r.from=r.from||ym(new Date());if(r.day<=day)S.tx.push(mkTx(d(r.day),r.type,r.amt,r.cur,r.cat,r.name,r.acc,{recId:r.id,sub:r.sub,post:r.post||''}));});
  var rows=[[1,'needs',62.4,'Courses'],[3,'wants',28,'Restaurant'],[6,'needs',41.8,'Courses'],[7,'culture',12,'Livre'],[8,'extra',35,'Réparation vélo'],[9,'family',60,'Tontine','other'],[10,'wants',45,'Vêtements'],[11,'family',90,'Envoi LemFi','mobile',0]];
  rows.forEach(function(r){S.tx.push(mkTx(d(r[0]),'exp',r[2],'EUR',r[1],r[3],'a1',{sub:r[4]||'',fee:r[5]||0}));});
  S.tx.push(mkTx(d(3),'tr',100,'EUR','','Épargne du mois','a1',{to:'a2'}));
  S.tx.push(mkTx(d(4),'exp',13,'EUR','needs','Marché','a3'));
  S.goals=[
    {id:'g1',name:'Terrain au pays',emoji:'🏡',target:7600,cur:'EUR',current:1830,monthly:150,rate:0,infl:3},
    {id:'g2',name:'Fonds d’urgence',emoji:'🛟',target:5000,cur:'EUR',current:3200,monthly:150,rate:2,infl:2}];
  S.oblig=[{id:'o1',name:'Charges du foyer familial',amt:150,cur:'EUR'},{id:'o2',name:'Scolarité',amt:90,cur:'EUR'}];
  S.varPlan=550;S.env={needs:500,wants:150,culture:60,extra:100,family:350};
  S.months[cur]={saving:200,sendMin:240,sendMax:420,plan:{mobile:300,bank:100,cash:0},reflection:''};
}
S=load();
if(!S){var gl=guessLang();S=blankState(gl,gl==='en'?'USD':'EUR');}
fixShape();
try{var k0='__t';localStorage.setItem(k0,'1');localStorage.removeItem(k0);}catch(e0){memOnly=true;}

function inherit(k){
  var keys=Object.keys(S.months).sort(),before=keys.filter(function(x){return x<k;}),after=keys.filter(function(x){return x>k;});
  var src=before.length?before[before.length-1]:(after.length?after[0]:null);
  if(!src)return blankMonth();
  var c=clone(S.months[src]);c.reflection='';return c;
}
function mget(k){return S.months[k]||inherit(k);}
function mset(k){if(!S.months[k])S.months[k]=inherit(k);return S.months[k];}
/* objective (50/30/20 or custom): history so a change only applies from the month it is made */
function ruleFor(k){var H=S.ruleHist||[],r=S.rule;for(var i=0;i<H.length;i++){if(H[i].from<=k)r=H[i].r;}return r;}
function applyRule(nr){
  var cm=ym(new Date()),H=S.ruleHist||(S.ruleHist=[]);
  if(!H.length)H.push({from:'0000-00',r:{n:S.rule.n,w:S.rule.w,s:S.rule.s}});
  S.ruleHist=H=H.filter(function(h){return h.from<cm;});
  H.push({from:cm,r:{n:nr.n,w:nr.w,s:nr.s}});S.rule={n:nr.n,w:nr.w,s:nr.s};
}
var PRESETS=[['bal',50,30,20],['sav',50,20,30],['debt',55,15,30],['custom']];
function presetOf(R){for(var i=0;i<PRESETS.length-1;i++){if(PRESETS[i][1]===R.n&&PRESETS[i][2]===R.w&&PRESETS[i][3]===R.s)return PRESETS[i][0];}return 'custom';}

/* ---------- calculations ---------- */
function eurOf(i){return toEur(i.amt,i.cur);}
function eff(x,a){
  var v=(x.cur===a.cur)?x.amt:fromEur(x.eur,a.cur);
  if(x.type==='exp')return x.acc===a.id?-v:0;
  if(x.type==='inc')return x.acc===a.id?v:0;
  var d=0;if(x.acc===a.id)d-=v;if(x.to===a.id)d+=v;return d;
}
function accBal(a,upTo){
  if(upTo&&a.since>upTo)return 0;
  var b=a.open;
  for(var i=0;i<S.tx.length;i++){var x=S.tx[i];if(x.status==='pending'||x.date<a.since||(upTo&&x.date>upTo))continue;b+=eff(x,a);}
  return b;
}
function hasM(a,k){return S.tx.some(function(x){return x.status!=='pending'&&x.date.slice(0,7)===k&&(x.acc===a.id||x.to===a.id);});}
function nwAt(date){return sum(S.accounts,function(a){return toEur(accBal(a,date),a.cur);});}
function nwSeries(per){
  var now=new Date(),pts=[],i,d,SP={'1m':[30,3],'3m':[91,7],'6m':[182,14],'1y':[365,30]};
  if(SP[per]){for(i=SP[per][0];i>0;i-=SP[per][1]){d=new Date(now);d.setDate(d.getDate()-i);pts.push(ymd(d));}pts.push(ymd(now));}
  else{
    var min=ymd(now);S.accounts.forEach(function(a){if(a.since<min)min=a.since;});
    var s=pd(min),n=0;pts.push(min);
    while(n<24){s=new Date(s.getFullYear(),s.getMonth()+1,1);if(s>now)break;pts.push(ymd(s));n++;}
    pts.push(ymd(now));
  }
  return pts.map(function(x){return {d:x,v:nwAt(x)};});
}
function monthTx(k){return S.tx.filter(function(x){return x.date.slice(0,7)===k;});}
function recOcc(k){
  return S.rec.filter(function(r){return (!r.from||k>=r.from)&&(!r.to||k<=r.to);}).map(function(r){
    var date=k+'-'+pad(Math.min(r.day,dim(k)));
    var done=S.tx.some(function(x){return x.recId===r.id&&x.date.slice(0,7)===k;});
    return {r:r,date:date,done:done};
  });
}
function calcM(k){
  var m=mget(k),tx=monthTx(k),occ=recOcc(k);
  var income=sum(occ.filter(function(o){return o.r.type==='inc';}),function(o){return eurOf(o.r);})+sum(tx.filter(function(x){return x.type==='inc'&&!x.recId;}),function(x){return x.eur;});
  var fixed=sum(occ.filter(function(o){return o.r.type==='exp';}),function(o){return eurOf(o.r);});
  var exps=tx.filter(function(x){return x.type==='exp';}),by={};
  CATS.forEach(function(c){by[c]=0;});
  exps.forEach(function(x){if(by[x.cat]!==undefined)by[x.cat]+=x.eur;});
  var variable=sum(exps.filter(function(x){return !x.recId&&x.cat!=='save'&&x.cat!=='invest';}),function(x){return x.eur;});
  var sends=exps.filter(function(x){return x.cat==='family'&&SENDS.indexOf(x.sub)>=0;}),types={};
  SENDS.forEach(function(s){var a=sends.filter(function(x){return x.sub===s;});types[s]={sent:sum(a,function(x){return x.eur;}),fee:sum(a,function(x){return x.fee||0;}),n:a.length};});
  var budget=income-fixed-m.saving;
  return {m:m,tx:tx,income:income,fixed:fixed,by:by,variable:variable,spentAll:sum(exps,function(x){return x.eur;}),incAct:sum(tx.filter(function(x){return x.type==='inc';}),function(x){return x.eur;}),sent:sum(sends,function(x){return x.eur;}),types:types,budget:budget,left:budget-variable};
}
function sendTotals(k){var o={tot:0};SENDS.forEach(function(x){o[x]=0;});S.tx.forEach(function(x){if(x.type==='exp'&&x.cat==='family'&&SENDS.indexOf(x.sub)>=0&&x.date.slice(0,7)===k){o[x.sub]+=x.eur;o.tot+=x.eur;}});return o;}
function projShares(P,k){
  var now=ym(new Date()),out=[],items=[];
  S.goals.forEach(function(g){var rem=Math.max(0,toEur(g.target-g.current,g.cur));if(rem<=0)return;var lm=g.date?Math.max(1,monthsBetween(now,g.date)):0;items.push({g:g,rem:rem,lm:lm,need:lm?rem/lm:rem,cur:toEur(g.monthly||0,g.cur)});});
  items.sort(function(a,b){return (a.lm||9999)-(b.lm||9999);});
  var room=P;
  items.forEach(function(x){
    if(room<=0)return;
    var want=Math.max(0,x.need-x.cur),give=Math.min(room,want>0?want:room/Math.max(1,1));
    if(!(want>0))return;
    give=Math.floor(Math.min(room,want));if(give<=0)return;
    room-=give;
    var mNew=x.cur+give,mm=Math.ceil(x.rem/mNew),mo=x.cur>0?Math.ceil(x.rem/x.cur):0,base=new Date();
    out.push({g:x.g,share:give,newReach:new Date(base.getFullYear(),base.getMonth()+mm,1),oldReach:mo?new Date(base.getFullYear(),base.getMonth()+mo,1):null,months:mm});
  });
  return {list:out,rest:room,has:items.length>0};
}
function suggest(k){
  var c=calcM(k),d=splitData(c,k),m=c.m,base=d.base,left=d.left,sent=c.sent;
  var rec=sum(recOcc(k).filter(function(o){return o.r.type==='exp'&&o.r.cat==='family';}),function(o){return eurOf(o.r);});
  var past=[],p=k.split('-'),i,v;
  for(i=1;i<=6&&past.length<3;i++){v=sendTotals(ym(new Date(+p[0],+p[1]-1-i,1))).tot;if(v>0)past.push(v);}
  var hasR=m.sendMax>0,mode,add=0,projP=0,free=0;
  if(left<0)mode='deficit';
  else if(hasR&&sent>m.sendMax)mode='over';
  else if(left>=5)mode='add';
  else mode='none';
  if(mode==='add'||mode==='over'){
    add=mode==='add'?Math.floor(left*0.2/5)*5:0;
    projP=Math.floor(left*0.6/5)*5;
    free=Math.max(0,left-add-projP);
  }
  var sMax=Math.max(0,Math.floor((sent+add)/5)*5);
  if(mode==='over')sMax=m.sendMax;
  var sMin=hasR?m.sendMin:(rec>0?rec:(past.length?Math.min.apply(null,past):0));
  sMin=Math.min(sMin,sMax);
  return {min:sMin,max:sMax,mode:mode,base:base,left:left,sent:sent,add:add,projP:projP,free:free,remain:Math.max(0,sMax-sent),deficit:left<0?-left:0,curMax:m.sendMax||0,over:hasR?sent-m.sendMax:0,proj:projShares(projP,k),fromRec:rec>0,hasPast:past.length>0};
}
function sendSplit(k,total){
  var acc0={},t0=0,p=k.split('-'),i,n=0,o;
  SENDS.forEach(function(x){acc0[x]=0;});
  for(i=1;i<=6&&n<3;i++){o=sendTotals(ym(new Date(+p[0],+p[1]-1-i,1)));if(o.tot>0){n++;SENDS.forEach(function(x){acc0[x]+=o[x];});t0+=o.tot;}}
  if(!(t0>0)){o=sendTotals(k);if(o.tot>0){SENDS.forEach(function(x){acc0[x]=o[x];});t0=o.tot;}}
  var out={};
  if(!(t0>0)){SENDS.forEach(function(x){out[x]=0;});out.mobile=total;return out;}
  SENDS.forEach(function(x){out[x]=Math.round(total*acc0[x]/t0*100)/100;});
  return out;
}
function activeTrip(){for(var i=0;i<S.trips.length;i++)if(S.trips[i].active)return S.trips[i];return null;}
function rateDue(){var u=S.rates.updated;return !u||u.slice(0,7)!==ym(new Date());}
function upcoming(){
  var now=new Date(),td=ymd(now),lim=ymd(new Date(now.getFullYear(),now.getMonth(),now.getDate()+30)),out=[];
  [ym(now),ym(new Date(now.getFullYear(),now.getMonth()+1,1))].forEach(function(k){
    recOcc(k).forEach(function(o){if(!o.done&&o.date>=td&&o.date<=lim)out.push({date:o.date,o:o});});
  });
  S.tx.forEach(function(x){if(x.status==='pending'&&x.date<=lim)out.push({date:x.date,x:x});});
  out.sort(function(p,q){return p.date<q.date?-1:(p.date>q.date?1:0);});
  return out.slice(0,40);
}
function upEur(u){return u.o?toEur(u.o.r.amt,u.o.r.cur):toEur(u.x.amt,u.x.cur);}
function nextRec(){
  var now=new Date(),td=ymd(now);
  for(var i=0;i<24;i++){
    var k=ym(new Date(now.getFullYear(),now.getMonth()+i,1)),l=recOcc(k).filter(function(o){return !o.done&&o.date>=td;});
    l.sort(function(p,q){return p.date<q.date?-1:1;});
    if(l.length)return l[0];
  }
  return null;
}
function monthsBetween(a,b){var p=a.split('-'),q=b.split('-');return (+q[0]-+p[0])*12+(+q[1]-+p[1]);}
function needMonthly(target,cur,rate,n){
  var r=Math.pow(1+rate/100,1/12)-1;n=Math.max(1,n);
  if(r===0)return Math.max(0,(target-cur)/n);
  var gr=Math.pow(1+r,n);return Math.max(0,(target-cur*gr)*r/(gr-1));
}
function incomeRef(){var a=calcM(ym(new Date())).income,p=new Date();p.setMonth(p.getMonth()-1);var b=calcM(ym(p)).income;return Math.max(a,b);}
function goalPlan(g){
  if(!(g.years>0))return '';
  var total=Math.max(1,Math.round(g.years*12)),start=(g.start||ymd(new Date())).slice(0,7),left=Math.max(1,total-Math.max(0,monthsBetween(start,ym(new Date()))));
  var need=needMonthly(g.target,g.current,g.rate,left),need0=needMonthly(g.target,g.base||0,g.rate,total),inc=incomeRef(),needE=toEur(need,g.cur);
  var h='<div class="note" style="margin-top:10px"><p style="margin:0 0 4px"><strong>'+(g.date?esc(t('planUntil'))+' '+esc(mlabel(g.date)):esc(t('planTitle'))+' '+numStr(g.years,1)+' '+esc(t(g.years>1?'years':'year')))+'</strong></p>';
  if(g.current>=g.target)return h+'<p class="pos" style="margin:0">'+esc(t('goalDone'))+'</p></div>';
  h+='<p style="margin:0"><span class="big" style="font-size:1.4rem">'+esc(fmt(need,g.cur))+'</span> / '+esc(t('perMonth'))+' · '+esc(fmt(need*12,g.cur))+' / '+esc(t('perYear'))+'</p>';
  if(inc>0){var sh=needE/inc*100,v=sh<=15?['good','planOk']:(sh<=30?['warn','planStretch']:['bad','planHard']);h+='<p class="small" style="margin:6px 0 0">'+Math.round(sh)+' % '+esc(t('planOfInc'))+' · <span class="pill '+v[0]+'">'+esc(t(v[1]))+'</span></p>';}
  else h+='<p class="small muted" style="margin:6px 0 0">'+esc(t('planNoInc'))+'</p>';
  if(g.start&&g.base!==undefined&&Math.abs(need-need0)>need0*0.05+1)h+='<p class="small '+(need>need0?'neg':'pos')+'" style="margin:6px 0 0">'+esc(t(need>need0?'planBehind':'planAhead'))+' : '+esc(fmt(need,g.cur))+' '+esc(t('planInstead'))+' '+esc(fmt(need0,g.cur))+' / '+esc(t('perMonth'))+'.</p>';
  if(g.monthly>0)h+='<p class="small muted" style="margin:6px 0 0">'+esc(t('planYours'))+' '+esc(fmt(g.monthly,g.cur))+' / '+esc(t('perMonth'))+(g.monthly<need?' · <span class="neg">'+esc(t('planShort'))+' '+esc(fmt(need-g.monthly,g.cur))+'</span>':'')+'</p>';
  return h+'</div>';
}
function fv(g,months){var r=Math.pow(1+g.rate/100,1/12)-1,v=g.current;for(var i=0;i<months;i++)v=v*(1+r)+g.monthly;return v;}
function proj(g){
  var r=Math.pow(1+g.rate/100,1/12)-1,v=g.current,reach=g.current>=g.target?0:null;
  for(var m=1;m<=600&&reach===null;m++){v=v*(1+r)+g.monthly;if(v>=g.target)reach=m;}
  var n10=fv(g,120);
  return {reach:reach,n10:n10,real10:n10/Math.pow(1+g.infl/100,10)};
}

/* ---------- formatting ---------- */
var nfCache={};
function fmt(v,c){var key=S.lang+c;if(!nfCache[key])nfCache[key]=new Intl.NumberFormat(loc(),{style:'currency',currency:c,minimumFractionDigits:c==='XOF'?0:2,maximumFractionDigits:c==='XOF'?0:2});return nfCache[key].format(v);}
function sec(){return S.disp==='EUR'?'USD':'EUR';}
function M(e){return fmt(fromEur(e,S.disp),S.disp);}
function M2(e){return '<span class="m2"><span class="m">'+esc(M(e))+'</span><span class="s">'+esc(fmt(fromEur(e,sec()),sec()))+'</span></span>';}
function cmp(e){return new Intl.NumberFormat(loc(),{notation:'compact',maximumFractionDigits:1}).format(fromEur(e,S.disp));}
function numStr(v,dec){if(!v)return '';var s=String(+(+v).toFixed(dec==null?2:dec));return S.lang==='fr'?s.replace('.',','):s;}
function fieldVal(e){return numStr(fromEur(e,S.disp),S.disp==='XOF'?0:2);}
function readEur(el){return toEur(num(el.value),S.disp);}
function curLabel(c){return c==='XOF'?'FCFA':c;}
function curSym(c){return c==='XOF'?'FCFA':(c==='EUR'?'€':'$');}
function dfmt(s){return new Intl.DateTimeFormat(loc(),{day:'numeric',month:'long',year:'numeric'}).format(pd(s));}
function dlong(s){return new Intl.DateTimeFormat(loc(),{weekday:'long',day:'numeric',month:'long'}).format(pd(s));}

/* ---------- view state ---------- */
var VM=ym(new Date()),TAB='home',F=null,SH=null;
var SUBTABS=['more','tx','recurring','trips','review','settings','guide','sub'];
var UI={per:'1m',tf:'all',tc:'all',sv:'bilan',span:1,sel:null,focus:'',confirmReset:false,restoreMsg:'',csv:'',lastCur:'EUR',fcat:'needs'};
var toastTimer=null;
function toast(msg,bad){var el=$('toast');el.textContent=msg;el.className='on'+(bad?' bad':'');clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.className='';},2200);}

/* ---------- components ---------- */

function MASC(sz,mood){
  var pose={cheer:'cheer',worry:'worry',wave:'wave'}[mood]||'scan';
  return '<img class="masc" src="assets/doc-'+pose+'.webp" height="'+sz+'" alt="Docteur Reset" loading="lazy" decoding="async">';
}
function pageMasc(pose,key){return '<div class="masc-row">'+MASC(64,pose)+'<p class="bubble">'+esc(t(key))+'</p></div>';}
function chip(a,v,on,label,cls){return '<button type="button" class="chip '+(cls||'')+'" data-a="'+a+'" data-v="'+esc(v)+'" aria-pressed="'+(on?'true':'false')+'">'+label+'</button>';}
function sfchip(field,val,label,cls){return chip('sf',field+':'+val,F[field]===val,label,cls);}
function bar(p,bad){p=Math.max(0,Math.min(100,p));return '<div class="bar'+(bad?' bad':'')+'"><i style="width:'+p.toFixed(1)+'%"></i></div>';}
function spark(ser){
  if(ser.length<2)return '';
  var min=Infinity,max=-Infinity;ser.forEach(function(p){if(p.v<min)min=p.v;if(p.v>max)max=p.v;});
  var rng=(max-min)||1,pts=ser.map(function(p,i){return (i/(ser.length-1)*100).toFixed(2)+','+(32-(p.v-min)/rng*28).toFixed(2);});
  var up=ser[ser.length-1].v>=ser[0].v,col=up?'var(--good)':'var(--bad)';
  return '<svg class="spark" viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label="'+esc(t('netWorth'))+'"><polygon points="0,36 '+pts.join(' ')+' 100,36" fill="'+col+'" opacity=".12"></polygon><polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke"></polyline></svg>';
}
function donut(by,total){
  var off=0,r=15.9155,segs='';
  CATS.forEach(function(c){var p=by[c]/total*100;if(p<=0)return;segs+='<circle r="'+r+'" cx="21" cy="21" fill="transparent" stroke="'+CCOL[c]+'" stroke-width="6" stroke-dasharray="'+p.toFixed(2)+' '+(100-p).toFixed(2)+'" stroke-dashoffset="'+(25-off).toFixed(2)+'"></circle>';off+=p;});
  return '<svg viewBox="0 0 42 42" class="donut" role="img" aria-label="'+esc(t('byCat'))+'"><circle r="'+r+'" cx="21" cy="21" fill="transparent" stroke="var(--soft)" stroke-width="6"></circle>'+segs+'<text x="21" y="22.6" text-anchor="middle" class="dtxt">'+esc(cmp(total))+'</text></svg>';
}
function rangeBar(sent,min,max){
  var top=Math.max(max,min,sent)*1.15;if(top<=0)top=1;
  var zl=min/top*100,zw=Math.max((max-min)/top*100,1.5),mk=Math.min(sent/top*100,99);
  return '<div class="range" role="img" aria-label="'+esc(t('yourRange'))+'"><div class="zone" style="left:'+zl.toFixed(1)+'%;width:'+zw.toFixed(1)+'%"></div><div class="mk" style="left:'+mk.toFixed(1)+'%"></div></div>';
}
function mlabel(k){var p=k.split('-');return new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(+p[0],+p[1]-1,1));}
function monthNav(){
  var p=VM.split('-'),label=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(+p[0],+p[1]-1,1));
  return '<div class="monthnav"><button type="button" class="icon" data-a="prev" aria-label="'+esc(t('prevM'))+'">‹</button><button type="button" class="mlabel" data-a="pickM" aria-label="'+esc(t('pickM'))+'">'+esc(label)+' <span aria-hidden="true">▾</span></button><button type="button" class="icon" data-a="next" aria-label="'+esc(t('nextM'))+'">›</button></div>';
}
function moneyField(id,field,eur,label){
  return '<label class="f" for="'+id+'">'+esc(label)+' <span class="muted small">('+curSym(S.disp)+')</span></label><input class="in" id="'+id+'" inputmode="decimal" data-f="'+field+'" value="'+esc(fieldVal(eur))+'" placeholder="0">';
}
function listEd(key){
  return '<div>'+S[key].map(function(it){
    var a='data-l="'+key+'" data-i="'+it.id+'"';
    return '<div class="li"><input class="in" '+a+' data-p="name" value="'+esc(it.name)+'" placeholder="'+esc(t('name'))+'" aria-label="'+esc(t('name'))+'">'+
      '<input class="in" inputmode="decimal" '+a+' data-p="amt" value="'+esc(numStr(it.amt,it.cur==='XOF'?0:2))+'" placeholder="0" aria-label="'+esc(t('amount'))+'">'+
      '<select class="in" '+a+' data-p="cur" aria-label="'+esc(t('currency'))+'">'+CURS.map(function(c){return '<option value="'+c+'"'+(it.cur===c?' selected':'')+'>'+curLabel(c)+'</option>';}).join('')+'</select>'+
      '<button type="button" class="icon" data-a="delItem" data-v="'+key+':'+it.id+'" aria-label="'+esc(t('del'))+'">×</button></div>';
  }).join('')+'<button type="button" class="btn ghost" data-a="addItem" data-v="'+key+'">+ '+esc(t('addLine'))+'</button></div>';
}
function banners(){
  var h='';
  if(S.demo)h+='<div class="note"><p>'+esc(t('demo'))+'</p><div class="acts"><button type="button" class="btn ghost" data-a="clearDemo">'+esc(t('clearDemo'))+'</button></div></div>';
  if(memOnly)h+='<div class="note bad"><p>'+esc(t('storageOff'))+'</p></div>';
  return h;
}
function txRow(x,showDate){
  var a=acc(x.acc),emo=x.type==='exp'?CEMO[x.cat]||'🛒':CEMO[x.type],title=x.note||(x.type==='exp'?t('c_'+x.cat):t('m_'+x.type));
  var sign=x.type==='exp'?'−':(x.type==='inc'?'+':''),cls=x.type==='inc'?'pos':'';
  var sub=(showDate?dfmt(x.date)+' · ':'')+(a?esc(a.name):'')+(x.type==='exp'?' · '+esc(t('c_'+x.cat)):'')+(x.post?' · '+esc(t('po_'+x.post)):'')+(x.sub?' · '+esc(t('sn_'+x.sub)):'')+(x.status==='pending'?' · '+esc(t('pending')):'');
  return '<button type="button" class="row" data-a="editTx" data-v="'+x.id+'"><span class="ico">'+emo+'</span><span class="mid"><span class="t">'+esc(title)+'</span><span class="muted small">'+sub+'</span></span><span class="amt '+cls+'">'+sign+esc(fmt(x.amt,x.cur))+(x.cur!==S.disp?'<span class="s">'+esc(M(x.eur))+'</span>':'')+'</span></button>';
}
function recRow(o,act){
  var r=o.r,emo=r.type==='inc'?'💰':(CEMO[r.cat]||'🔁');
  return '<button type="button" class="row" data-a="'+act+'" data-v="'+(act==='valRec'?r.id+'|'+o.date:r.id)+'"><span class="ico">'+emo+'</span><span class="mid"><span class="t">'+esc(r.name)+'</span><span class="muted small">'+esc(dfmt(o.date))+(act==='valRec'?' · '+esc(t('toValidate')):'')+'</span></span><span class="amt '+(r.type==='inc'?'pos':'')+'">'+(r.type==='inc'?'+':'−')+esc(fmt(r.amt,r.cur))+'</span></button>';
}

/* ---------- views ---------- */
var V={},ACT={};
function sendSummary(c){
  var m=c.m,min=m.sendMin,max=m.sendMax,sent=c.sent;
  var st=(max<=0&&min<=0)?'none':(sent<min?'below':(sent>max?'above':'in'));
  return {st:st,cls:{none:'warn',below:'warn',in:'good',above:'bad'}[st]};
}
function fbCard(){
  if(!cloud())return '';
  var f=UI.fb||(UI.fb={r:0,txt:'',done:false,busy:false});
  if(f.done)return '<div class="card"><div class="masc-row">'+MASC(56,'cheer')+'<div><h3>'+esc(t('fbT'))+'</h3><p class="pos" style="margin:0">'+esc(t('fbThanks'))+'</p></div></div></div>';
  return '<div class="card"><h3>'+esc(t('fbT'))+'</h3><p class="muted small" style="margin:0 0 8px">'+esc(t('fbP'))+'</p>'+
    '<div class="chips" role="group" aria-label="'+esc(t('fbRate'))+'">'+[1,2,3,4,5].map(function(n){return '<button type="button" class="chip'+(f.r===n?' on':'')+'" data-a="fbStar" data-v="'+n+'" aria-label="'+n+'/5" aria-pressed="'+(f.r===n)+'">'+(f.r>=n?'★':'☆')+'</button>';}).join('')+'</div>'+
    '<textarea class="in" id="fb-text" maxlength="2000" style="margin-top:10px" placeholder="'+esc(t('fbPh'))+'">'+esc(f.txt)+'</textarea>'+
    '<button type="button" class="btn full" data-a="fbSend"'+(f.busy?' disabled':'')+'>'+esc(t('fbSend'))+'</button></div>';
}
/* ---------- objective (50/30/20) ---------- */
function ruleFromF(){var n=Math.round(num(F.n)),w=Math.round(num(F.w)),q=Math.round(num(F.s));if(n<0||w<0||q<0||n+w+q!==100)return null;return {n:n,w:w,s:q};}
function presetCards(sel,act){
  return PRESETS.map(function(p){return '<button type="button" class="opt'+(sel===p[0]?' on':'')+'" data-a="'+act+'" data-v="'+p[0]+'" aria-pressed="'+(sel===p[0])+'"><strong>'+esc(t('rp_'+p[0]))+'</strong><span class="muted small">'+esc(t('rp_'+p[0]+'H'))+'</span></button>';}).join('');
}
function customInputs(){
  var tot=Math.round(num(F.n))+Math.round(num(F.w))+Math.round(num(F.s));
  return '<div class="card flat" style="margin-top:10px">'+inp('s-on','n',t('ruleN')+' (%)','','inputmode="numeric"')+inp('s-ow','w',t('ruleW')+' (%)','','inputmode="numeric"')+inp('s-os','s',t('ruleS')+' (%)','','inputmode="numeric"')+'<p class="small '+(tot===100?'muted':'neg')+'" style="margin:8px 0 0">'+esc(t('ruleTotal'))+' '+tot+' %</p></div>';
}
function pickPreset(v){
  F.preset=v;var p=PRESETS.filter(function(x){return x[0]===v;})[0];
  if(p&&p[1]!==undefined){F.n=String(p[1]);F.w=String(p[2]);F.s=String(p[3]);}
  if(SH)redrawSheet();else render();
}
ACT.onbPick=pickPreset;ACT.objPick=pickPreset;
ACT.onbGo=function(){var r=ruleFromF();if(!r){toast(t('errRule'),true);return;}S.rule=r;S.ruleHist=[];S.objDone=true;F=null;save();render();window.scrollTo(0,0);};
function objSheet(){return '<p class="small muted">'+esc(t('objFromNote'))+'</p><div class="opts">'+presetCards(F.preset,'objPick')+'</div>'+(F.preset==='custom'?customInputs():'')+'<button type="button" class="btn full" data-a="saveObj">'+esc(t('save'))+'</button>';}
ACT.editObj=function(){var R=ruleFor(ym(new Date()));F={preset:presetOf(R),n:String(R.n),w:String(R.w),s:String(R.s)};openSheet(t('objTitle'),objSheet);};
ACT.saveObj=function(){var r=ruleFromF();if(!r){toast(t('errRule'),true);return;}applyRule(r);save();closeSheet();render();toast(t('saved'));};
V.onboard=function(){
  if(!F||F.ob!==1)F={ob:1,preset:'bal',n:'50',w:'30',s:'20'};
  return '<section class="card onb"><div class="chips" style="justify-content:flex-end" role="group" aria-label="Langue / Language">'+['fr','en'].map(function(l){return chip('lang',l,S.lang===l,l==='fr'?'Français':'English');}).join('')+'</div>'+
    '<div class="masc-row">'+MASC(96,'wave')+'<p class="bubble">'+esc(t('onbHi'))+'</p></div><h2 style="margin:6px 0 10px">'+esc(t('onbQ'))+'</h2><div class="opts">'+presetCards(F.preset,'onbPick')+'</div>'+(F.preset==='custom'?customInputs():'')+
    '<p class="small muted" style="margin:12px 0 0">'+esc(t('onbNote'))+'</p><button type="button" class="btn full" data-a="onbGo">'+esc(t('onbGo'))+'</button></section>';
};
function objCard(k){
  var a=r3sum([k]),R=ruleFor(k),base=a.inc>0?a.inc:a.used;
  var h='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">'+esc(t('objTitle'))+'</h3><button type="button" class="link" data-a="editObj">'+esc(t('objEdit'))+'</button></div><p class="small muted" style="margin:4px 0 0">'+esc(t('objSub'))+' '+R.n+' / '+R.w+' / '+R.s+'</p>';
  if(base<=0)return h+'<p class="muted" style="margin-top:10px">'+esc(t('noSpend'))+'</p></div>';
  return h+[['n','ruleN',a.n,R.n,true],['w','ruleW',a.w,R.w,true],['s','ruleS',a.s,R.s,false]].map(function(r){
    var p=pct(r[2],base),diff=r[2]-base*r[3]/100,bad=r[4]?diff>0.5:diff<-0.5;
    return '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+RC[r[0]]+';margin-right:8px"></i><strong>'+esc(t(r[1]))+'</strong></span><span>'+esc(M(r[2]))+' <span class="muted small">'+p+' % / '+r[3]+' %</span></span></div>'+bar(r[3]>0?r[2]/(base*r[3]/100)*100:(r[2]>0?100:0),bad)+'</div>';
  }).join('')+'</div>';
}
/* ---------- reminders for what is about to be debited ---------- */
function evtOn(e,ds){
  if(e.rep==='m'){if(ds<e.date)return false;var p=ds.split('-'),dd=Math.min(+e.date.slice(8,10),dim(p[0]+'-'+p[1]));return +p[2]===dd;}
  return e.date===ds;
}
function evtDue(){
  var now=new Date(),out=[];
  [0,1,2].forEach(function(off){var ds=ymd(new Date(now.getFullYear(),now.getMonth(),now.getDate()+off));(S.events||[]).forEach(function(e){if(evtOn(e,ds))out.push({e:e,date:ds,off:off});});});
  return out;
}
function evtWhen(off){return off===0?t('today'):(off===1?t('tomorrow'):t('inNDays').replace('{n}',off));}
function notifyDue(){
  if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
  evtDue().forEach(function(o){var k=o.e.id+'|'+o.date+'|'+o.off;if(S.notified[k])return;S.notified[k]=1;try{new Notification('MONEY RESET · '+evtWhen(o.off),{body:o.e.name+(o.e.amt>0?' · '+fmt(o.e.amt,o.e.cur||'EUR'):'')});}catch(x){}});
  var ks=Object.keys(S.notified);if(ks.length>200){ks.slice(0,ks.length-200).forEach(function(k){delete S.notified[k];});}
  save();
}
function remindList(){
  var d=(S.remind&&S.remind.days)||2,now=new Date(),td=ymd(now),lim=ymd(new Date(now.getFullYear(),now.getMonth(),now.getDate()+d)),out=[];
  [ym(now),ym(new Date(now.getFullYear(),now.getMonth()+1,1))].forEach(function(k){recOcc(k).forEach(function(o){if(!o.done&&o.r.type==='exp'&&o.date>=td&&o.date<=lim)out.push(o);});});
  S.tx.forEach(function(x){if(x.status==='pending'&&x.type==='exp'&&x.date>=td&&x.date<=lim)out.push({date:x.date,r:{name:x.note||t('c_'+x.cat),amt:x.amt,cur:x.cur,acc:x.acc,type:'exp'}});});
  out.sort(function(p,q){return p.date<q.date?-1:(p.date>q.date?1:0);});
  return out;
}
function remindBox(){
  var l=remindList(),ev=evtDue();if(!l.length&&!ev.length)return '';
  var by={};l.forEach(function(o){var id=o.r.acc||'';by[id]=(by[id]||0)+toEur(o.r.amt,o.r.cur);});
  var h='<div class="note warn"><p><strong>'+esc(t('remT'))+'</strong></p>'+ev.map(function(o){return '<p class="small" style="margin:4px 0">🔔 <strong>'+esc(evtWhen(o.off))+'</strong> · '+esc(o.e.name)+(o.e.amt>0?' · '+esc(fmt(o.e.amt,o.e.cur||'EUR')):'')+'</p>';}).join('')+l.map(function(o){var a=acc(o.r.acc);return '<p class="small" style="margin:4px 0">'+esc(dfmt(o.date))+' · '+esc(o.r.name)+' · −'+esc(fmt(o.r.amt,o.r.cur))+(a?' · '+esc(a.name):'')+'</p>';}).join('');
  Object.keys(by).forEach(function(id){var a=acc(id);if(!a)return;var bal=toEur(accBal(a),a.cur);if(bal<by[id])h+='<p class="small neg" style="margin:6px 0 0"><strong>'+esc(t('remFund'))+' '+esc(a.name)+' : '+esc(M(by[id]-bal))+'</strong></p>';});
  return h+'</div>';
}
/* ---------- alert when the monthly sending budget is exceeded ---------- */
function sendAlert(c){
  var max=c.m.sendMax,sent=c.sent;if(!(max>0)||sent<=max)return '';
  var wants=S.sendAlloc==='wants',a=r3sum([VM]),base=a.inc>0?a.inc:a.used,R=ruleFor(VM),share=wants?a.w:a.n,tgt=wants?R.w:R.n;
  return '<div class="note bad"><p><strong>'+esc(t('alertSendT'))+'</strong></p><p class="small" style="margin:0 0 4px">'+esc(t('alertSendA'))+' '+esc(M(sent))+' · '+esc(t('alertSendB'))+' '+esc(M(max))+' (+'+esc(M(sent-max))+').</p>'+(base>0?'<p class="small" style="margin:0">'+esc(t(wants?'ruleW':'ruleN'))+' : '+pct(share,base)+' % '+esc(t('alertVs'))+' '+tgt+' %.</p>':'')+'</div>';
}
/* ---------- abonnement : essai gratuit 1 mois, puis abonnement ---------- */
var SUB_LAUNCH='2026-11-23',TRIAL_DAYS=30;
function subPrice(){return {m:CFG.priceM||4.99,y:CFG.priceY||39};}
function trialStart(){
  if(AUTH.session&&AUTH.session.created){var c=String(AUTH.session.created).slice(0,10);return c>SUB_LAUNCH?c:SUB_LAUNCH;}
  var v=null;try{v=localStorage.getItem('moneyreset.trial');}catch(e){}
  if(!v||v<SUB_LAUNCH){v=ymd(new Date());if(v<SUB_LAUNCH)v=SUB_LAUNCH;try{localStorage.setItem('moneyreset.trial',v);}catch(e){}}
  return v;
}
function subInfo(){
  var dev=null;try{dev=localStorage.getItem('moneyreset.devsub');}catch(e){}
  var st=trialStart(),sd=pd(st),end=new Date(sd.getFullYear(),sd.getMonth(),sd.getDate()+TRIAL_DAYS),now=new Date(),t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var days=Math.ceil((end-t0)/864e5),sub=S.sub||{};
  var active=sub.status==='active'&&(!sub.end||sub.end>=ymd(now));
  var state=dev==='active'||active?'active':(dev==='expired'?'expired':(dev==='trial'||days>0?'trial':'expired'));
  if(dev==='expired')days=0;
  return {state:state,days:Math.max(0,days),end:ymd(end),endD:end,plan:sub.plan||'',next:sub.end||''};
}
function isLocked(){return subInfo().state==='expired';}
var LOCKED={addMenu:1,addTx:1,editTx:1,saveTx:1,delTx:1,valRec:1,valRecGo:1,addAcc:1,editAcc:1,saveAcc:1,delAcc:1,delAccDo:1,addDiff:1,addGoal:1,editGoal:1,saveGoal:1,delGoal:1,goalAdd:1,saveDep:1,addRec:1,editRec:1,saveRec:1,delRec:1,editEnv:1,saveEnv:1,addTrip:1,saveTrip:1,toggleTrip:1,delTrip:1,editRange:1,saveRange:1,addSend:1,projApply:1,useSugg:1,addItem:1,delItem:1,saveRefl:1,restoreBk:1,impOpen:1,impGo:1,impSel:1,editObj:1,saveObj:1,addEvt:1,editEvt:1,saveEvt:1,delEvt:1,loadDemo:1,clearDemo:1};
function subBanner(){
  var i=subInfo();if(i.state==='active')return '';
  if(i.state==='expired')return '<button type="button" class="subbar bad" data-a="tab" data-v="sub"><span>🔒 '+esc(t('subExpBar'))+'</span><strong>'+esc(t('subSee'))+' ›</strong></button>';
  var soon=i.days<=7;
  return '<button type="button" class="subbar'+(soon?' warn':'')+'" data-a="tab" data-v="sub"><span>'+(soon?'⏳ ':'🎁 ')+esc(t('subTrialBar').replace('{n}',i.days))+'</span><strong>'+esc(t('subSee'))+' ›</strong></button>';
}
V.sub=function(){
  var i=subInfo(),P=subPrice(),h='';
  if(i.state==='active'){
    h+='<div class="card"><h3>✅ '+esc(t('subActive'))+'</h3><p class="small" style="margin:6px 0 0">'+esc(t(i.plan==='y'?'subPlanY':'subPlanM'))+(i.next?' · '+esc(t('subNext'))+' '+esc(dfmt(i.next)):'')+'</p>'+
      '<button type="button" class="btn ghost full" data-a="subManage" style="margin-top:12px">'+esc(t('subManage'))+'</button></div>';
  }else{
    var pc=Math.max(0,Math.min(100,(TRIAL_DAYS-i.days)/TRIAL_DAYS*100));
    h+='<div class="card"><h3>'+(i.state==='expired'?'🔒 '+esc(t('subExpT')):'🎁 '+esc(t('subTrialT')))+'</h3>'+
      '<p class="small" style="margin:6px 0 8px">'+esc(i.state==='expired'?t('subExpD'):t('subTrialD').replace('{n}',i.days).replace('{d}',dfmt(ymd(i.endD))))+'</p>'+(i.state==='trial'?bar(pc,i.days<=7):'')+'</div>';
    h+='<div class="plans"><div class="card plan"><p class="eyebrow">'+esc(t('subPlanM'))+'</p><div class="big">'+esc(fmt(P.m,'EUR'))+'<span class="muted small"> '+esc(t('subPerMonth'))+'</span></div><p class="small muted">'+esc(t('subMDesc'))+'</p><button type="button" class="btn full" data-a="subGo" data-v="m">'+esc(t('subGo'))+'</button></div>'+
      '<div class="card plan best"><span class="badge">'+esc(t('subBest'))+' −'+Math.round((1-P.y/(P.m*12))*100)+' %</span><p class="eyebrow">'+esc(t('subPlanY'))+'</p><div class="big">'+esc(fmt(P.y,'EUR'))+'<span class="muted small"> '+esc(t('subPerYear'))+'</span></div><p class="small muted">≈ '+esc(fmt(P.y/12,'EUR'))+' '+esc(t('subPerMonth'))+'</p><button type="button" class="btn full" data-a="subGo" data-v="y">'+esc(t('subGo'))+'</button></div></div>';
    if(S.subInterest)h+='<div class="note"><p class="small" style="margin:0">✓ '+esc(t('subInterest'))+'</p></div>';
  }
  h+='<div class="card"><h3>'+esc(t('subIncT'))+'</h3><ul class="small" style="padding-left:18px;margin:6px 0 0">'+[1,2,3,4,5,6].map(function(n){return '<li style="margin:3px 0">'+esc(t('subInc'+n))+'</li>';}).join('')+'</ul></div>';
  h+='<div class="card"><h3>'+esc(t('subFairT'))+'</h3><p class="small" style="margin:6px 0 0">'+esc(t('subFair'))+'</p><button type="button" class="btn ghost full" data-a="tab" data-v="settings" style="margin-top:10px">'+esc(t('subData'))+'</button></div>';
  return h;
};
ACT.paywall=function(){openSheet(t('subExpT'),function(){return '<p>'+esc(t('subPayD'))+'</p><button type="button" class="btn full" data-a="subSee">'+esc(t('subSee'))+'</button><button type="button" class="btn ghost full" data-a="closeSheet" style="margin-top:8px">'+esc(t('close'))+'</button>';});};
ACT.subSee=function(){closeSheet();ACT.tab('sub');};
ACT.subGo=function(v){
  if(cloud()&&!AUTH.session){AUTH.guest=false;try{localStorage.removeItem('moneyreset.guest');}catch(e){}AUTH.mode='up';AUTH.msg='';toast(t('subNeedAcc'));render();return;}
  var url=v==='y'?CFG.payYearly:CFG.payMonthly;
  if(url){var u=url+(url.indexOf('?')<0?'?':'&')+'client_reference_id='+encodeURIComponent((AUTH.session&&AUTH.session.uid)||'')+(AUTH.session&&AUTH.session.email?'&prefilled_email='+encodeURIComponent(AUTH.session.email):'');window.open(u,'_blank','noopener');return;}
  S.subInterest=v;save();toast(t('subSoon'));render();
};
ACT.subManage=function(){if(CFG.portalUrl){window.open(CFG.portalUrl,'_blank','noopener');return;}toast(t('subManageSoon'));};
function topCard(){
  if(!S.demo&&!S.tx.length&&!S.accounts.length&&!S.rec.length)return '<section class="card"><div class="masc-row">'+MASC(96,'scan')+'<p class="bubble">'+esc(t('mascHi'))+'</p></div><h3>'+esc(t('welcomeT'))+'</h3><p class="muted">'+esc(t('welcomeP'))+'</p><ol class="small" style="padding-left:18px;margin:8px 0"><li>'+esc(t('welcome1'))+'</li><li>'+esc(t('welcome2'))+'</li><li>'+esc(t('welcome3'))+'</li></ol><button type="button" class="btn full" data-a="impOpen">'+esc(t('impBtn'))+'</button><button type="button" class="btn ghost full" data-a="addTx">'+esc(t('welcomeManual'))+'</button></section>';
  return '<section class="card"><div class="masc-row">'+MASC(48,'scan')+'<h3 style="margin:0">'+esc(t('addTop'))+'</h3></div><div class="addpair"><button type="button" class="btn" data-a="impOpen"><span aria-hidden="true">📄</span> '+esc(t('impBtn'))+'</button><button type="button" class="btn alt" data-a="addTx"><span aria-hidden="true">✍️</span> '+esc(t('manualBtn'))+'</button></div></section>';
}
V.home=function(){
  var nw=nwAt(null),ser=nwSeries(UI.per),delta=ser.length>1?ser[ser.length-1].v-ser[0].v:0;
  var h=subBanner()+topCard()+remindBox();
  h+='<section class="card"><p class="eyebrow">'+esc(t('netWorth'))+'</p><div class="big">'+M2(nw)+'</div><p class="delta '+(delta>=0?'pos':'neg')+'">'+(delta>=0?'+':'−')+esc(M(Math.abs(delta)))+' <span class="muted">· '+esc(t('per_'+UI.per))+'</span></p>'+spark(ser)+
    '<div class="chips sm">'+['1m','3m','6m','1y','all'].map(function(p){return chip('per',p,UI.per===p,esc(t('pc_'+p)));}).join('')+'</div></section>';
  var upto=VM<ym(new Date())?VM+'-'+('0'+dim(VM)).slice(-2):null,mname=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(+VM.slice(0,4),+VM.slice(5,7)-1,1));
  h+='<h3 class="sec">'+esc(t('accounts'))+' · '+esc(mname)+'<button type="button" class="link" data-a="addAcc">+ '+esc(t('addAcc'))+'</button></h3>';
  if(!S.accounts.length)h+='<div class="card flat"><p class="muted">'+esc(t('noAcc2'))+'</p></div>';
  else{
    h+='<div class="card">'+S.accounts.map(function(a){var b=accBal(a,upto),nd=!hasM(a,VM);return '<button type="button" class="row" data-a="accOpen" data-v="'+a.id+'"><span class="ico">'+AEMO[a.type]+'</span><span class="mid"><span class="t">'+esc(a.name)+'</span><span class="muted small">'+esc(t('at_'+a.type))+(nd?'<span class="muted small">'+esc(t('noOpAcc'))+' · '+esc(t('lastKnown'))+' '+esc(fmt(b,a.cur))+'</span>':'')+'</span></span><span class="amt '+(b<0?'neg':'')+'">'+(nd?'—':esc(fmt(b,a.cur)))+(a.cur!==S.disp?'<span class="s">'+esc(M(toEur(b,a.cur)))+'</span>':'')+'</span></button>';}).join('')+'</div>';
    var by={},debts=0;S.accounts.forEach(function(a){if(!hasM(a,VM))return;var e=toEur(accBal(a,upto),a.cur);if(e>=0)by[a.type]=(by[a.type]||0)+e;else debts+=-e;});
    var tot=sum(Object.keys(by),function(k){return by[k];});
    if(tot>0)h+='<div class="card"><h3>'+esc(t('alloc'))+'</h3><div class="stack">'+Object.keys(by).map(function(k){return '<i style="width:'+(by[k]/tot*100).toFixed(1)+'%;background:'+ACOL[k]+'"></i>';}).join('')+'</div><div class="legend">'+Object.keys(by).map(function(k){return '<span><i style="background:'+ACOL[k]+'"></i>'+esc(t('at_'+k))+' '+Math.round(by[k]/tot*100)+' %</span>';}).join('')+'</div>'+(debts>0?'<p class="small neg" style="margin-top:8px">'+esc(t('debts'))+' : '+esc(M(debts))+'</p>':'')+'</div>';
  }
  var c=calcM(VM),over=c.left<0,base=c.income-c.fixed-c.m.saving;
  var curM=VM===ym(new Date()),vp=VM.split('-');
  var hs=h;h='';
  h+='<h3 class="sec">'+esc(curM?t('thisMonth'):new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(+vp[0],+vp[1]-1,1)))+'<button type="button" class="link" data-a="editEnv">'+esc(t('edit'))+'</button></h3>'+monthNav()+(curM?'':'<p style="margin:-2px 0 10px"><button type="button" class="link" data-a="goNow">↩ '+esc(t('backNow'))+'</button></p>');
  var dd=splitData(c,VM),rl=dd.left,pl=planData(VM);over=rl<0;
  var emptyM=!c.tx.length;
  h+='<section class="hero'+(over?' over':'')+'"><p class="eyebrow">'+esc(over?t('over'):t('left'))+'</p><div class="big">'+M2(Math.abs(rl))+'</div>'+(dd.base>0?bar(dd.used/dd.base*100,over):'')+'<p class="eyebrow">'+esc(t('income'))+' '+esc(M(dd.base))+' · '+esc(t('expenses'))+' '+esc(M(dd.used))+'</p>';
  if(emptyM)h+='<p class="small muted" style="margin:8px 0 0">'+esc(t('noOpsHelp'))+'</p>';
  if(pl.inc>0||pl.exp>0)h+='<p class="small muted" style="margin:8px 0 0">'+esc(t('planLine'))+' : '+(pl.inc>0?'+'+esc(M(pl.inc))+' ':'')+(pl.exp>0?'−'+esc(M(pl.exp))+' ':'')+'→ '+esc(t('planBal'))+' <strong>'+esc(M(rl+pl.inc-pl.exp))+'</strong></p>';
  if(VM===ym(new Date())&&rl>0){var dl=dim(VM)-new Date().getDate()+1;if(dl>0)h+='<p class="eyebrow" style="margin-top:6px">≈ '+esc(M(rl/dl))+' '+esc(t('perDay'))+'</p>';}
  h+='</section>';h=hs+'<div class="mblock">'+h+'</div>';h+=objCard(VM);
  var envs=SPEND.filter(function(k){return S.env[k]>0;});
  if(envs.length)h+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">'+esc(t('envelopes'))+'</h3><button type="button" class="link" data-a="editEnv">'+esc(t('edit'))+'</button></div><p class="small muted" style="margin:4px 0 0">'+esc(t('envHelp'))+'</p>'+envs.map(function(k){var sp=c.by[k],lim=S.env[k],rest=lim-sp;return '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span>'+CEMO[k]+' '+esc(t('c_'+k))+'</span><span style="font-weight:700">'+esc(M(lim))+'</span></div>'+bar(lim>0?sp/lim*100:0,sp>lim)+'<p class="small" style="margin:4px 0 0;display:flex;justify-content:space-between"><span class="muted">'+esc(t('envSpent'))+' '+esc(M(sp))+'</span><span class="'+(rest<0?'neg':'pos')+'">'+(rest<0?esc(t('envOver'))+' '+esc(M(-rest)):esc(t('envLeft'))+' '+esc(M(rest)))+'</span></p></div>';}).join('')+'</div>';
  var up=upcoming();
  h+='<h3 class="sec">'+esc(t('upcoming'))+'<button type="button" class="link" data-a="tab" data-v="recurring">'+esc(t('manage'))+'</button></h3>';
  var upRow=function(u){return u.o?recRow(u.o,'valRec'):txRow(u.x,true);};
  var topIds=up.slice().sort(function(p,q){return upEur(q)-upEur(p);}).slice(0,3),rest=up.filter(function(u){return topIds.indexOf(u)<0;});
  h+=up.length?'<div class="card" style="padding:4px 16px"><p class="small muted" style="margin:10px 0 0">'+esc(t('upTop'))+'</p>'+topIds.map(upRow).join('')+(rest.length?'<button type="button" class="link" style="margin:8px 0 10px" data-a="upMore">'+(UI.upMore?esc(t('upLess')):esc(t('upAll'))+' ('+rest.length+')')+'</button>'+(UI.upMore?rest.map(upRow).join(''):''):'')+'</div>':'<div class="card flat"><p class="muted">'+esc(t('noUp'))+'</p></div>'+(function(){var n=nextRec();return n?'<div class="card" style="padding:4px 16px"><p class="small muted" style="margin:10px 0 0">'+esc(t('nextRec'))+'</p>'+recRow(n,'valRec')+'</div>':'';})();
  var ss=sendSummary(c);
  h+=sendAlert(c)+'<div class="card"><h3>'+esc(t('sendCard'))+'</h3><div class="big" style="font-size:1.6rem">'+M2(c.sent)+'</div>'+(c.m.sendMax>0?rangeBar(c.sent,c.m.sendMin,c.m.sendMax)+'<p class="small muted">'+esc(t('range'))+' '+esc(M(c.m.sendMin))+' – '+esc(M(c.m.sendMax))+' · <span class="pill '+ss.cls+'">'+esc(t('st_'+ss.st))+'</span></p>':'')+'<button type="button" class="btn ghost" data-a="tab" data-v="send">'+esc(t('seeSend'))+'</button></div>';
  return h;
};
function capacity(){
  var d=new Date(),vals=[],i,k,c;
  for(i=1;i<=6&&vals.length<3;i++){k=ym(new Date(d.getFullYear(),d.getMonth()-i,1));c=calcM(k);if(c.tx.length)vals.push(splitData(c,k).left);}
  if(!vals.length){k=ym(d);c=calcM(k);if(c.tx.length)vals.push(splitData(c,k).left);}
  return vals.length?{v:sum(vals,function(x){return x;})/vals.length,n:vals.length}:null;
}
function planCard(){
  var cap=capacity(),now=ym(new Date()),items=[];
  S.goals.forEach(function(g){
    var rem=Math.max(0,toEur(g.target-g.current,g.cur));if(rem<=0)return;
    var left=g.date?Math.max(1,monthsBetween(now,g.date)):0;
    items.push({g:g,rem:rem,left:left,need:left?rem/left:0});
  });
  if(!items.length)return '';
  items.sort(function(a,b){return (a.left||9999)-(b.left||9999);});
  var h='<div class="card"><h3>'+esc(t('planAll'))+'</h3>';
  if(!cap||cap.v<=0){return h+'<p class="muted small" style="margin:0">'+esc(cap?t('planNoRoom'):t('planNoData'))+'</p></div>';}
  var room=cap.v,need=sum(items,function(x){return x.need;});
  h+='<p class="small muted" style="margin:0 0 8px">'+esc(t('planRoom'))+' <strong>'+esc(M(cap.v))+'</strong> / '+esc(t('perMonth'))+' · '+esc(t('planAvg'))+' '+cap.n+' '+esc(t('months'))+'</p>';
  items.forEach(function(x){
    var give=x.left?Math.min(x.need,room):room/Math.max(1,items.filter(function(y){return !y.left;}).length);
    if(x.left)room=Math.max(0,room-give);
    var ok=x.left&&give>=x.need-0.5,mm=give>0?Math.ceil(x.rem/give):0,when=mm?new Date(new Date().getFullYear(),new Date().getMonth()+mm,1):null;
    h+='<div style="padding:8px 0;border-top:1px solid var(--line)"><div style="display:flex;justify-content:space-between;gap:8px"><strong>'+esc(x.g.emoji||'🎯')+' '+esc(x.g.name)+'</strong><strong>'+esc(M(give))+' / '+esc(t('perMonth'))+'</strong></div><p class="small muted" style="margin:2px 0 0">'+
      (x.left?esc(t('planNeeds'))+' '+esc(M(x.need))+' / '+esc(t('perMonth'))+' '+esc(t('planFor'))+' '+x.left+' '+esc(t('months'))+' · ':'')+
      (ok?'<span class="pos">'+esc(t('planCovered'))+'</span>':(give>0?'<span class="neg">'+esc(t('planPartial'))+'</span> · '+esc(t('planReach'))+' '+esc(new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(when)):'<span class="neg">'+esc(t('planNone'))+'</span>'))+'</p></div>';
  });
  if(need>cap.v)h+='<p class="small neg" style="margin:8px 0 0">'+esc(t('planGap'))+' '+esc(M(need-cap.v))+' / '+esc(t('perMonth'))+'. '+esc(t('planGapH'))+'</p>';
  else h+='<p class="small pos" style="margin:8px 0 0">'+esc(t('planAllOk'))+' '+esc(M(cap.v-need))+' / '+esc(t('perMonth'))+'.</p>';
  return h+'</div>';
}
V.goals=function(){
  var h=pageMasc('cheer','mascGoals')+'<div style="display:flex;justify-content:flex-end;margin:0 2px 8px"><button type="button" class="link" data-a="addGoal">+ '+esc(t('addGoal'))+'</button></div>';
  if(!S.goals.length)h+='<div class="card flat"><p class="muted">'+esc(t('noGoal'))+'</p></div>';
  else h+=planCard();
  S.goals.forEach(function(g){
    var p=g.target>0?g.current/g.target*100:0,pr=proj(g),when;
    if(pr.reach===0)when=t('goalDone');else if(pr.reach===null)when=t('goalNever');
    else{var y=Math.floor(pr.reach/12),mo=pr.reach%12;when=t('goalIn')+' '+(y?y+' '+t(y>1?'years':'year')+' ':'')+(mo?mo+' '+t('months'):'');}
    h+='<div class="card"><div style="display:flex;gap:12px;align-items:center"><span class="ico" style="width:44px;height:44px;border-radius:12px;background:var(--soft);display:grid;place-items:center;font-size:1.4rem">'+esc(g.emoji||'🎯')+'</span><div style="flex:1"><h3>'+esc(g.name)+'</h3><span class="muted small">'+esc(fmt(g.current,g.cur))+' / '+esc(fmt(g.target,g.cur))+(g.date?' · '+esc(mlabel(g.date)):'')+'</span></div><strong>'+Math.round(p)+' %</strong></div>'+bar(p)+
      goalPlan(g)+((g.monthly>0||!g.date)?'<p style="margin:6px 0 2px"><strong>'+esc(when)+'</strong></p><p class="small muted">'+esc(t('goalProj'))+' : '+esc(fmt(pr.n10,g.cur))+' · '+esc(t('goalReal'))+' '+esc(fmt(pr.real10,g.cur))+'<br>'+esc(t('goalAssume'))+' '+esc(fmt(g.monthly,g.cur))+'/'+esc(t('perMonth'))+', '+numStr(g.rate,1)+' % '+esc(t('perYear'))+', '+esc(t('inflation'))+' '+numStr(g.infl,1)+' %</p>':'')+
      '<div class="btns"><button type="button" class="btn" data-a="goalAdd" data-v="'+g.id+'">'+esc(t('deposit'))+'</button><button type="button" class="btn ghost" data-a="editGoal" data-v="'+g.id+'">'+esc(t('edit'))+'</button></div></div>';
  });
  return h;
};
V.tx=function(){
  var c=calcM(VM),f=UI.tf,pm='';
  var fc=UI.tc||'all';
  var list=c.tx.filter(function(x){return (f==='all'||x.type===f)&&(fc==='all'||(x.type==='exp'&&x.cat===fc));});
  var h=monthNav()+pm+'<div class="grid2"><div class="tile"><p class="eyebrow">'+esc(t('income'))+'</p><p class="val pos">'+esc(M(c.incAct))+'</p></div><div class="tile"><p class="eyebrow">'+esc(t('expenses'))+'</p><p class="val">'+esc(M(c.spentAll))+'</p></div></div>';
  h+='<div class="chips sm" style="margin:12px 0 4px">'+['all','exp','inc','tr'].map(function(k){return chip('tf',k,f===k,esc(t('tf_'+k)));}).join('')+'</div>';
  if(c.spentAll>0)h+='<div class="chips sm" style="margin:0 0 4px">'+CATS.filter(function(k){return c.by[k]>0;}).map(function(k){return chip('tc',fc===k?'all':k,fc===k,CEMO[k]+' '+esc(t('c_'+k)));}).join('')+'</div>';
  if(!list.length)return h+'<div class="card flat" style="margin-top:12px"><p class="muted">'+esc(t('none'))+'</p></div>';
  var idx={};S.tx.forEach(function(x,i){idx[x.id]=i;});
  list.sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:idx[b.id]-idx[a.id]);});
  var days=[],g={};list.forEach(function(x){if(!g[x.date]){g[x.date]=[];days.push(x.date);}g[x.date].push(x);});
  days.forEach(function(d){
    var tot=sum(g[d].filter(function(x){return x.type==='exp';}),function(x){return x.eur;});
    h+='<div class="day"><span>'+esc(dlong(d))+'</span><span>'+(tot>0?'−'+esc(M(tot)):'')+'</span></div><div class="card" style="padding:4px 16px">'+g[d].map(function(x){return txRow(x,false);}).join('')+'</div>';
  });
  return h;
};
function mval(x,mt){
  if(x.status==='pending')return 0;
  if(mt==='exp')return (x.type==='exp'&&x.cat!=='save'&&x.cat!=='invest')?x.eur:0;
  if(mt==='inc')return x.type==='inc'?x.eur:0;
  if(mt==='save'||mt==='invest'){
    if(x.type==='exp'&&x.cat===mt)return x.eur;
    if(x.type==='tr'){var a=acc(x.to);if(a&&a.type===(mt==='save'?'savings':'invest'))return x.eur;}
    return 0;
  }
  return (x.type==='exp'&&x.cat===mt)?x.eur:0;
}
function mlab(mt){return mt==='exp'?t('cmExp'):(mt==='inc'?t('income'):CEMO[mt]+' '+t('c_'+mt));}
function prepRows(k){
  var isNow=k===ym(new Date()),td=ymd(new Date());
  var l=recOcc(k).filter(function(o){return !o.done&&(!isNow||o.date>=td);}).map(function(o){return {date:o.date,name:o.r.name,amt:o.r.amt,cur:o.r.cur,acc:o.r.acc,type:o.r.type,cat:o.r.cat,o:o};});
  monthTx(k).filter(function(x){return x.status==='pending'&&(!isNow||x.date>=td);}).forEach(function(x){l.push({date:x.date,name:x.note||t('c_'+x.cat),amt:x.amt,cur:x.cur,acc:x.acc,type:x.type==='inc'?'inc':'exp',cat:x.cat,x:x});});
  l.sort(function(p,q){return p.date<q.date?-1:(p.date>q.date?1:0);});
  return l;
}
function prepCard(k){
  var isNow=k===ym(new Date()),l=prepRows(k);
  var h='<h3 class="sec">'+esc(t('prepT'))+'<button type="button" class="link" data-a="addRec">+ '+esc(t('prepAdd'))+'</button></h3>';
  if(!l.length)return h+'<div class="card flat"><p class="muted">'+esc(t('prepNone'))+'</p></div>';
  var by={};l.forEach(function(o){if(o.type!=='exp')return;var id=o.acc||'';by[id]=(by[id]||0)+toEur(o.amt,o.cur);});
  var ids=Object.keys(by).filter(function(id){return acc(id);}),tot=sum(l.filter(function(o){return o.type==='exp';}),function(o){return toEur(o.amt,o.cur);});
  h+='<div class="card"><p class="small muted" style="margin:0">'+esc(t('prepTotal'))+'</p><div class="big" style="font-size:1.5rem">'+esc(M(tot))+'</div>';
  if(ids.length)h+='<p class="small muted" style="margin:8px 0 0">'+esc(t('prepNeed'))+'</p>'+ids.map(function(id){var a=acc(id),bal=toEur(accBal(a),a.cur),need=by[id],miss=isNow?need-bal:0;
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px"><span>'+AEMO[a.type]+' '+esc(a.name)+'</span><span><strong>'+esc(M(need))+'</strong> '+(miss>0?'<span class="pill bad">'+esc(t('prepMiss'))+' '+esc(M(miss))+'</span>':(isNow?'<span class="pill good">'+esc(t('prepOk'))+'</span>':''))+'</span></div>';}).join('');
  h+='</div><div class="card" style="padding:4px 16px">'+l.map(function(o){
    var a=acc(o.acc),emo=o.type==='inc'?'💰':(CEMO[o.cat]||'🔁');
    return '<button type="button" class="row" data-a="'+(o.o?'valRec':'editTx')+'" data-v="'+(o.o?o.o.r.id+'|'+o.date:o.x.id)+'"><span class="ico">'+emo+'</span><span class="mid"><span class="t">'+esc(o.name)+'</span><span class="muted small">'+esc(dfmt(o.date))+(a?' · '+esc(a.name):'')+'</span></span><span class="amt '+(o.type==='inc'?'pos':'')+'">'+(o.type==='inc'?'+':'−')+esc(fmt(o.amt,o.cur))+'</span></button>';}).join('')+'</div>';
  return h;
}
function evtForm(){
  return '<p class="muted">'+esc(dlong(F.date))+'</p>'+inp('s-ename','name',t('evtName'),'')+inp('s-eamt','amt',t('evtAmt'),'','inputmode="decimal"')+'<label class="f">'+esc(t('evtKind'))+'</label><div class="chips">'+['debit','buy','other'].map(function(k){return sfchip('kind',k,esc(t('ek_'+k)));}).join('')+'</div><div class="chips" style="margin-top:8px">'+chip('st','rep',!!F.rep,esc(t('evtRep')))+'</div><p class="small muted" style="margin:8px 0 0">'+esc(t('evtHelp'))+'</p>'+btnRow('saveEvt',F.id?'delEvt':'');
}
ACT.addEvt=function(v){F={id:null,date:v||UI.sel||ymd(new Date()),name:'',amt:'',kind:'debit',rep:false};openSheet(t('addEvt'),evtForm);};
ACT.editEvt=function(v){var e=(S.events||[]).filter(function(x){return x.id===v;})[0];if(!e)return;F={id:e.id,date:e.date,name:e.name,amt:e.amt>0?numStr(e.amt):'',kind:e.kind,rep:e.rep==='m'};openSheet(t('addEvt'),evtForm);};
ACT.saveEvt=function(){
  var nm=(F.name||'').trim();if(!nm){toast(t('evtErr'),true);return;}
  var e={id:F.id||uid(),date:F.date,name:nm,amt:num(F.amt)||0,cur:'EUR',kind:F.kind||'debit',rep:F.rep?'m':''};
  var i=S.events.map(function(x){return x.id;}).indexOf(e.id);if(i>=0)S.events[i]=e;else S.events.push(e);
  save();closeSheet();render();toast(t('saved'));notifyDue();
};
ACT.delEvt=function(){S.events=S.events.filter(function(x){return x.id!==F.id;});save();closeSheet();render();};
ACT.notifOn=function(){if(typeof Notification==='undefined'){toast(t('notifNo'),true);return;}Notification.requestPermission().then(function(p){if(p==='granted'){toast(t('notifOk'));notifyDue();}else toast(t('notifNo'),true);render();});};
function remCard(){
  var d=(S.remind&&S.remind.days)||2;
  return '<div class="card"><h3>'+esc(t('remSetT'))+'</h3><p class="small muted">'+esc(t('remSetP'))+'</p><div class="chips">'+[1,2,3,5].map(function(n){return chip('remDays',String(n),d===n,n+' '+esc(t(n>1?'remDays':'remDay')));}).join('')+'</div><p class="small muted" style="margin:10px 0 0">'+esc(t('remInApp'))+'</p><p class="small muted" style="margin:4px 0 0">'+esc(t('remEmailSoon'))+'</p>'+((typeof Notification!=='undefined'&&Notification.permission!=='granted')?'<p style="margin:10px 0 0"><button type="button" class="btn ghost" data-a="notifOn">🔔 '+esc(t('notifBtn'))+'</button></p><p class="small muted" style="margin:6px 0 0">'+esc(t('notifHelp'))+'</p>':'')+'</div>';
}
ACT.upMore=function(){UI.upMore=!UI.upMore;render();};
ACT.remDays=function(v){S.remind={days:+v||2};save();render();};
function yearNav(y){return '<div class="monthnav"><button type="button" class="icon" data-a="yprev" aria-label="-1">‹</button><strong>'+y+'</strong><button type="button" class="icon" data-a="ynext" aria-label="+1">›</button></div>';}
V.cal=function(){
  var mt=UI.cm||'exp',sc=UI.cs||'m',MT=['exp','inc'].concat(CATS);
  var h=pageMasc('wave','mascCal')+'<div class="chips sm" style="margin:2px 0 6px">'+chip('cs','m',sc==='m',esc(t('cmMonth')))+chip('cs','y',sc==='y',esc(t('cmYear')))+'</div>'+
    '<label class="f" for="cm-sel" style="margin-top:0">'+esc(t('cmShow'))+'</label><select class="in" id="cm-sel" data-ui="cm">'+MT.map(function(k){return '<option value="'+k+'"'+(mt===k?' selected':'')+'>'+esc(mlab(k))+'</option>';}).join('')+'</select>';
  if(sc==='y'){
    var y=+VM.slice(0,4),vals=[],tot=0,mx=0;
    for(var m=1;m<=12;m++){var k=y+'-'+pad(m),v=sum(S.tx.filter(function(x){return x.date.slice(0,7)===k;}),function(x){return mval(x,mt);});vals.push(v);tot+=v;if(v>mx)mx=v;}
    h+=yearNav(y)+'<div class="grid2"><div class="tile"><p class="eyebrow">'+esc(t('cmTotal'))+' '+y+'</p><p class="val">'+esc(M(tot))+'</p></div><div class="tile"><p class="eyebrow">'+esc(t('cmAvg'))+'</p><p class="val">'+esc(M(tot/12))+'</p></div></div>';
    h+='<div class="card" style="margin-top:12px"><div class="ygrid">'+vals.map(function(v,i){
      var k=y+'-'+pad(i+1),nm=new Intl.DateTimeFormat(loc(),{month:'short'}).format(new Date(y,i,1));
      return '<button type="button" data-a="calMonth" data-v="'+k+'" class="'+(k===ym(new Date())?'today':'')+'"><span>'+esc(nm)+'</span><strong>'+(v>0?esc(cmp(v)):'–')+'</strong><span class="ybar"><i style="height:'+(mx>0?(v/mx*100).toFixed(0):0)+'%"></i></span></button>';
    }).join('')+'</div></div><p class="small muted" style="margin:8px 4px">'+esc(t('cmTapMonth'))+'</p>';
    return h;
  }
  var p=VM.split('-'),yy=+p[0],mo=+p[1]-1,n=dim(VM),off=(new Date(yy,mo,1).getDay()+6)%7,td=ymd(new Date());
  if(!UI.sel||UI.sel.slice(0,7)!==VM)UI.sel=(td.slice(0,7)===VM)?td:VM+'-01';
  var txs=monthTx(VM),occ=recOcc(VM),amt={},dots={},mtot=0;
  txs.forEach(function(x){var v=mval(x,mt);if(v>0){amt[x.date]=(amt[x.date]||0)+v;mtot+=v;}if(x.type==='inc')(dots[x.date]=dots[x.date]||{}).g=1;});
  occ.forEach(function(o){if(!o.done)(dots[o.date]=dots[o.date]||{}).r=1;});
  for(var q=1;q<=n;q++){var qd=VM+'-'+pad(q);if((S.events||[]).some(function(e){return evtOn(e,qd);}))(dots[qd]=dots[qd]||{}).e=1;}
  var liquid=sum(S.accounts.filter(function(a){return LIQ.indexOf(a.type)>=0;}),function(a){return toEur(accBal(a),a.cur);});
  var pend=occ.filter(function(o){return !o.done;}),fc=liquid+sum(pend,function(o){return (o.r.type==='inc'?1:-1)*eurOf(o.r);});
  h+=monthNav()+'<div class="grid2"><div class="tile"><p class="eyebrow">'+esc(mlab(mt))+'</p><p class="val">'+esc(M(mtot))+'</p></div><div class="tile"><p class="eyebrow">'+esc(t('forecast'))+'</p><p class="val '+(fc>=0?'':'neg')+'">'+esc(M(fc))+'</p></div></div><p class="small muted" style="margin:6px 4px 0">'+esc(t('liquid'))+' : '+esc(M(liquid))+'</p>';
  var wd=[];for(var i=0;i<7;i++)wd.push(new Intl.DateTimeFormat(loc(),{weekday:'narrow'}).format(new Date(2024,0,1+i)));
  h+='<div class="card" style="margin-top:12px"><div class="cal">'+wd.map(function(w){return '<span class="wd">'+esc(w)+'</span>';}).join('');
  for(var e=0;e<off;e++)h+='<button type="button" class="empty" tabindex="-1" aria-hidden="true"></button>';
  for(var d=1;d<=n;d++){
    var ds=VM+'-'+pad(d),dt=dots[ds]||{};
    h+='<button type="button" data-a="selDay" data-v="'+ds+'" class="'+(ds===td?'today ':'')+(ds===UI.sel?'sel':'')+'"><span>'+d+'</span><span class="am">'+(amt[ds]?esc(cmp(amt[ds])):'&nbsp;')+'</span><span class="dots">'+(dt.r?'<i></i>':'')+(dt.g?'<i class="g"></i>':'')+(dt.e?'<i class="e"></i>':'')+'</span></button>';
  }
  h+='</div></div>';
  h+=prepCard(VM);
  var dayTx=txs.filter(function(x){return x.date===UI.sel&&mval(x,mt)>0;}),dayRec=occ.filter(function(o){return o.date===UI.sel&&!o.done&&(mt==='exp'?(o.r.type==='exp'&&o.r.cat!=='save'&&o.r.cat!=='invest'):(mt==='inc'?o.r.type==='inc':(o.r.type==='exp'&&o.r.cat===mt)));});
  h+='<div class="day"><span>'+esc(dlong(UI.sel))+'</span></div>';
  h+=(dayTx.length||dayRec.length)?'<div class="card" style="padding:4px 16px">'+dayRec.map(function(o){return recRow(o,'valRec');}).join('')+dayTx.map(function(x){return txRow(x,false);}).join('')+'</div>':'<div class="card flat"><p class="muted">'+esc(t('none'))+'</p></div>';
  var dayEv=(S.events||[]).filter(function(e){return evtOn(e,UI.sel);});
  h+=dayEv.map(function(e){return '<button type="button" class="row" data-a="editEvt" data-v="'+e.id+'"><span class="ico">🔔</span><span class="mid"><span class="t">'+esc(e.name)+'</span><span class="muted small">'+esc(t('ek_'+e.kind))+(e.rep==='m'?' · '+esc(t('evtRepShort')):'')+' · '+esc(t('evtHelpShort'))+'</span></span><span class="amt">'+(e.amt>0?esc(fmt(e.amt,e.cur||'EUR')):'')+'</span></button>';}).join('');
  h+='<p style="margin:8px 0 0"><button type="button" class="btn" data-a="addEvt" data-v="'+UI.sel+'">🔔 '+esc(t('addEvt'))+'</button></p>';
  return h+remCard();
};
function splitData(c,k){k=k||VM;
  var b={needs:c.by.needs+c.by.extra,wants:c.by.wants+c.by.culture,fam:c.by.family,sav:c.by.save,inv:c.by.invest};
  c.tx.forEach(function(x){if(x.type!=='tr')return;var a=acc(x.to);if(a&&a.type==='savings')b.sav+=x.eur;else if(a&&a.type==='invest')b.inv+=x.eur;});
  var used=b.needs+b.wants+b.fam+b.sav+b.inv;
  return {b:b,used:used,base:c.incAct,left:c.incAct-used};
}
/* planned = recurring items of the month not recorded yet (shown separately, never mixed with real figures) */
function planData(k){
  var now=ym(new Date()),o={inc:0,exp:0};
  if(k<now)return o;
  recOcc(k).forEach(function(q){if(q.done)return;var e=eurOf(q.r);if(q.r.type==='inc')o.inc+=e;else o.exp+=e;});
  return o;
}
function splitCard(c){
  var d=splitData(c),h='<div class="card"><h3>'+esc(t('splitTitle'))+'</h3>';
  if(d.used<=0&&d.base<=0)return h+'<p class="muted">'+esc(t('noSpend'))+'</p></div>';
  var parts=[['splitNeeds',d.b.needs,'#2F6FB0'],['splitWants',d.b.wants,'#F28C28'],['splitFam',d.b.fam,'#E8B23A'],['splitSave',d.b.sav,'#1F9E7A'],['splitInv',d.b.inv,'#8E5BA8']];
  var left=Math.max(0,d.left),denom=Math.max(d.base,d.used,0.01);
  var all=parts.concat([['splitLeft',left,'var(--line)']]);
  h+='<div class="stack">'+all.map(function(p){return '<i style="width:'+(p[1]/denom*100).toFixed(1)+'%;background:'+p[2]+'"></i>';}).join('')+'</div>';
  h+=all.map(function(p){return '<div style="display:flex;justify-content:space-between;margin-top:8px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+p[2]+';margin-right:8px"></i>'+esc(t(p[0]))+'</span><span>'+esc(M(p[1]))+' <span class="muted small">'+Math.round(p[1]/denom*100)+' %</span></span></div>';}).join('');
  if(d.left>=0)h+='<p style="margin-top:12px"><strong>'+esc(t('splitLeftIs'))+' '+esc(M(d.left))+'</strong></p><p class="small muted">'+esc(t('splitHint'))+'</p>';
  else h+='<p class="neg" style="margin-top:12px"><strong>'+esc(t('splitOver'))+' '+esc(M(-d.left))+'</strong></p>';
  return h+'<p class="small muted" style="margin-top:8px">'+esc(t('splitRef'))+'</p></div>';
}
var RC={n:'#2F6FB0',w:'#F28C28',s:'#1F9E7A'};
function r3(k){var c=calcM(k),d=splitData(c,k),fw=S.sendAlloc==='wants';return {k:k,c:c,inc:d.base,n:d.b.needs+(fw?0:d.b.fam),w:d.b.wants+(fw?d.b.fam:0),s:d.b.sav+d.b.inv,used:d.used,left:d.left};}
function r3sum(keys){var a={inc:0,n:0,w:0,s:0,used:0,left:0,by:{},parts:[]};CATS.forEach(function(q){a.by[q]=0;});keys.forEach(function(k){var x=r3(k);a.parts.push(x);['inc','n','w','s','used','left'].forEach(function(f){a[f]+=x[f];});CATS.forEach(function(q){a.by[q]+=x.c.by[q];});});return a;}
function monthsEnding(k,n){var p=k.split('-'),o=[];for(var i=n-1;i>=0;i--)o.push(ym(new Date(+p[0],+p[1]-1-i,1)));return o;}
function pct(v,base){return base>0?Math.round(v/base*100):0;}
function ruleEditor(){
  var R=S.rule;
  return '<div class="card"><h3>'+esc(t('ruleTitle'))+'</h3><p class="small muted" style="margin:0 0 8px">'+esc(t('ruleHelp'))+'</p>'+
    [['n','ruleN'],['w','ruleW'],['s','ruleS']].map(function(r){return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+RC[r[0]]+';margin-right:8px"></i>'+esc(t(r[1]))+'</span><span style="white-space:nowrap"><input class="in" style="width:72px;display:inline-block;text-align:right" inputmode="numeric" data-rule="'+r[0]+'" value="'+R[r[0]]+'" aria-label="'+esc(t(r[1]))+'"> %</span></div>';}).join('')+
    '<p class="small muted" style="margin:10px 0 0">'+esc(t('ruleTotal'))+' '+(R.n+R.w+R.s)+' %</p><p class="small muted" style="margin:6px 0 0">'+esc(t('objFromNote'))+'</p><button type="button" class="btn ghost full" data-a="ruleReset">'+esc(t('ruleReset'))+'</button><p class="small muted" style="margin-top:8px">'+esc(t('ruleFam'))+'</p></div>';
}
function repDetail(key,a){
  var cats=key==='n'?['needs','extra'].concat(S.sendAlloc==='wants'?[]:['family']):(key==='w'?['wants','culture'].concat(S.sendAlloc==='wants'?['family']:[]):['save','invest']);
  var tot=0,plan=0,by={},trs={},LS={};
  a.parts.forEach(function(p){p.c.tx.forEach(function(x){
    if(x.type==='exp'&&cats.indexOf(x.cat)>=0){var q=x.cat==='family'?'~family':(x.post||'');by[q]=(by[q]||0)+x.eur;tot+=x.eur;(LS[q]=LS[q]||[]).push(x);}
    else if(x.type==='tr'&&key==='s'){var ac=acc(x.to);if(ac&&(ac.type==='savings'||ac.type==='invest')){var q2='~tr'+ac.id;trs[q2]=ac.name;by[q2]=(by[q2]||0)+x.eur;tot+=x.eur;}}
  });
    recOcc(p.k).forEach(function(o){if(o.done||o.r.type!=='exp'||cats.indexOf(o.r.cat)<0)return;var q=o.r.cat==='family'?'~family':(o.r.post||''),e=eurOf(o.r);by[q]=(by[q]||0)+e;tot+=e;plan+=e;});
  });
  if(tot<=0)return '<p class="small muted" style="margin:8px 0 0">'+esc(t('repNoDetail'))+'</p>';
  var keys=Object.keys(by).sort(function(p,q){return by[q]-by[p];});
  return '<div class="repdet">'+keys.map(function(k){
    var lbl=k===''?t('postOtherLbl'):(k==='~family'?'🌍 '+t('c_family'):(k.indexOf('~tr')===0?'↪ '+trs[k]:t('po_'+k)));
    var pk=key+'|'+k,op=!!(UI.repPost&&UI.repPost[pk]),L=LS[k]||[];
    var det='';
    if(op&&L.length){
      var sl=L.slice().sort(function(p,q){return q.eur-p.eur;}),avg=by[k]/L.length;
      det='<div class="repops"><p class="small muted" style="margin:6px 0 2px">'+L.length+' '+esc(t(L.length>1?'repOps':'repOp'))+' · '+esc(t('repAvg'))+' '+esc(M(avg))+'</p>'+sl.map(function(x){return txRow(x,true);}).join('')+'</div>';
    }
    return '<div style="margin-top:6px"><button type="button" class="repbtn" data-a="repPost" data-v="'+esc(pk)+'" aria-expanded="'+op+'" style="padding:2px 0"><span>'+esc(lbl)+' <span class="muted">'+(L.length?(op?'▾':'▸'):'')+'</span></span><span><strong>'+esc(M(by[k]))+'</strong> <span class="muted small">'+Math.round(by[k]/tot*100)+' %</span></span></button>'+bar(by[k]/tot*100,false)+det+'</div>';}).join('')+
    (plan>0?'<p class="small muted" style="margin:8px 0 0">'+esc(t('repPlanned'))+' '+esc(M(plan))+'</p>':'')+(by['']>tot*0.25?'<p class="small muted" style="margin:8px 0 0">'+esc(t('repUnclass'))+'</p>':'')+'</div>';
}
ACT.repPost=function(v){UI.repPost=UI.repPost||{};UI.repPost[v]=!UI.repPost[v];render();};
ACT.repOpen=function(v){UI.repOpen=UI.repOpen||{};UI.repOpen[v]=!UI.repOpen[v];render();};
function repCard(a,title){
  var base=a.inc>0?a.inc:a.used,R=ruleFor(VM),h='<div class="card"><h3>'+esc(title)+'</h3>';
  if(base<=0)return h+'<p class="muted">'+esc(t('noSpend'))+'</p></div>';
  var rows=[['n','ruleN',a.n,R.n,true],['w','ruleW',a.w,R.w,true],['s','ruleS',a.s,R.s,false]];
  var left=Math.max(0,a.inc-a.used),den=Math.max(base,a.used,0.01);
  function stack(vals){return '<div class="stack">'+vals.map(function(v){return '<i style="width:'+(v[0]/den*100).toFixed(1)+'%;background:'+v[1]+'"></i>';}).join('')+'</div>';}
  h+='<p class="small muted" style="margin:0">'+esc(t('rReal'))+'</p>'+stack(rows.map(function(r){return [r[2],RC[r[0]]];}).concat([[left,'var(--line)']]));
  h+='<p class="small muted" style="margin:6px 0 0">'+esc(t('rTarget'))+'</p>'+stack(rows.map(function(r){return [base*r[3]/100,RC[r[0]]];}));
  h+=rows.map(function(r){var p=pct(r[2],base),diff=r[2]-base*r[3]/100,bad=r[4]?diff>0.5:diff<-0.5,msg;
    if(r[4])msg=diff>0.5?t('rOver')+' '+M(diff):t('rOk');else msg=diff<-0.5?t('rUnder')+' '+M(-diff):t('rOk');
    var open=!!(UI.repOpen&&UI.repOpen[r[0]]);
    return '<div style="margin-top:14px"><button type="button" class="repbtn" data-a="repOpen" data-v="'+r[0]+'" aria-expanded="'+open+'"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+RC[r[0]]+';margin-right:8px"></i><strong>'+esc(t(r[1]))+'</strong> <span class="muted">'+(open?'▾':'▸')+'</span></span><span><strong>'+esc(M(r[2]))+'</strong></span></button>'+
      '<div class="small muted" style="display:flex;justify-content:space-between"><span>'+p+' % · '+esc(t('rTarget'))+' '+r[3]+' %</span><span class="'+(bad?'neg':'pos')+'">'+esc(msg)+'</span></div>'+bar(r[3]>0?r[2]/(base*r[3]/100)*100:(r[2]>0?100:0),bad)+(open?repDetail(r[0],a):'')+'<p class="small muted" style="margin:4px 0 0">'+(open?'':esc(t('repTap')))+'</p></div>';}).join('');
  h+='<div style="display:flex;justify-content:space-between;margin-top:14px"><span>'+esc(t('rLeft'))+'</span><strong class="'+(a.inc-a.used>=0?'pos':'neg')+'">'+esc(M(a.inc-a.used))+'</strong></div>';
  return h+'</div>';
}
function postCard(c){
  var inc={},byc={},any=false;
  c.tx.forEach(function(x){
    if(x.type==='inc'){var k=x.post||'';inc[k]=(inc[k]||0)+x.eur;if(k)any=true;}
    else if(x.type==='exp'&&x.cat){var o=byc[x.cat]=byc[x.cat]||{tot:0,p:{}},q=x.post||'';o.tot+=x.eur;o.p[q]=(o.p[q]||0)+x.eur;if(q)any=true;}
  });
  var h='<div class="card"><h3>'+esc(t('postDetail'))+'</h3>';
  if(!any)return h+'<p class="muted small">'+esc(t('postDetailHint'))+'</p></div>';
  function line(lbl,v,b){return '<div style="display:flex;justify-content:space-between;margin-top:'+(b?10:4)+'px'+(b?';font-weight:700':'')+'"><span'+(b?'':' class="muted"')+'>'+lbl+'</span><span>'+esc(M(v))+'</span></div>';}
  var ik=Object.keys(inc);
  if(ik.length){h+='<h4 style="margin:6px 0 0">'+esc(t('incBySrc'))+'</h4>';INCP.concat(['']).forEach(function(k){if(inc[k])h+=line(esc(k?t('po_'+k):t('postOtherLbl')),inc[k],false);});}
  CATS.forEach(function(cat){var o=byc[cat];if(!o||o.tot<=0)return;
    h+='<div style="margin-top:14px;border-top:1px solid var(--line);padding-top:6px">'+line(CEMO[cat]+' '+esc(t('c_'+cat)),o.tot,true);
    postList('exp',cat).concat(['']).sort(function(p,q){return (o.p[q]||0)-(o.p[p]||0);}).forEach(function(k){if(o.p[k])h+=line(esc(k?t('po_'+k):t('postOtherLbl')),o.p[k],false);});
    h+='</div>';});
  return h+'</div>';
}
function insights(a,c){
  var out=[],R=ruleFor(VM),base=a.inc>0?a.inc:a.used;
  if(base<=0)return out;
  var late=monthsEnding(VM,3).filter(function(k){var x=r3(k);return x.inc>0&&x.used>x.inc;}).length;
  if(a.inc>0&&a.used>a.inc)out.push(['bad',t('diOver')+' '+M(a.used-a.inc)+'.'+(late>1?' '+t('diRepeat')+' '+late+' '+t('diMonths')+'.':'')]);
  [['n','ruleN',a.n,R.n],['w','ruleW',a.w,R.w]].forEach(function(r){var d=r[2]-base*r[3]/100;if(d>base*0.02)out.push(['bad',t(r[1])+' : '+pct(r[2],base)+' % '+t('alertVs')+' '+r[3]+' % (+'+M(d)+')']);});
  var sd=base*R.s/100-a.s;if(sd>base*0.02)out.push(['warn',t('ruleS')+' : '+pct(a.s,base)+' % '+t('alertVs')+' '+R.s+' % ('+t('diMissing')+' '+M(sd)+')']);
  var top=CATS.filter(function(k){return k!=='save'&&k!=='invest'&&c.by[k]>0;}).sort(function(p,q){return c.by[q]-c.by[p];})[0];
  if(top)out.push(['info',t('diTop')+' : '+CEMO[top]+' '+t('c_'+top)+' — '+M(c.by[top])+' ('+pct(c.by[top],base)+' %)']);
  if(c.fixed>0&&a.inc>0&&c.fixed/a.inc>0.5)out.push(['warn',t('diFixed')+' '+pct(c.fixed,a.inc)+' %.']);
  if(c.m.sendMax>0&&c.sent>c.m.sendMax)out.push(['bad',t('alertSendT')+' (+'+M(c.sent-c.m.sendMax)+').']);
  if(!out.some(function(o){return o[0]==='bad'||o[0]==='warn';}))out.unshift(['good',t('diAllGood')]);
  return out;
}
function diagCard(a,c){
  var l=insights(a,c);if(!l.length)return '';
  var bad=l.some(function(o){return o[0]==='bad';});
  return '<div class="card"><div class="masc-row">'+MASC(56,bad?'worry':'cheer')+'<h3 style="margin:0">'+esc(t('diagT'))+'</h3></div>'+l.map(function(o){var col={bad:'var(--bad)',warn:'var(--warn)',good:'var(--good)',info:'var(--gold)'}[o[0]];return '<p class="small" style="margin:6px 0;display:flex;gap:8px"><i style="flex:none;width:10px;height:10px;border-radius:50%;margin-top:5px;background:'+col+'"></i><span>'+esc(o[1])+'</span></p>';}).join('')+'</div>';
}
/* simulation workspace: nothing here touches the user's real data */
function simGrp(x){return (x.cat==='needs'||x.cat==='extra')?'n':((x.cat==='wants'||x.cat==='culture')?'w':(x.cat==='family'?(S.sendAlloc==='wants'?'w':'n'):'s'));}
function simPostes(){
  var c=calcM(VM),by={};
  c.tx.forEach(function(x){
    var g,q;
    if(x.type==='exp'){g=simGrp(x);q=x.cat==='family'?'~family':(x.post||'');}
    else if(x.type==='tr'){var ac=acc(x.to);if(ac&&(ac.type==='savings'||ac.type==='invest')){g='s';q='~tr'+ac.id;}else return;}
    else return;
    var k='p|'+g+'|'+q;by[k]=(by[k]||0)+x.eur;
  });
  return by;
}
function simPLabel(k){
  var q=k.split('|')[2];
  if(q==='')return t('postOtherLbl');if(q==='~family')return '🌍 '+t('c_family');
  if(q.indexOf('~tr')===0){var a=acc(q.slice(3));return '↪ '+(a?a.name:'');}
  return t('po_'+q);
}
function simPostCard(){
  var G=[['n','ruleN'],['w','ruleW'],['s','ruleS']],keys=Object.keys(UI.simP0||{});
  if(!keys.length)return '';
  return '<h4 style="margin:16px 0 0">'+esc(t('simDetail'))+'</h4><p class="small muted" style="margin:2px 0 4px">'+esc(t('simDetailH'))+'</p>'+G.map(function(g){
    var ks=keys.filter(function(k){return k.split('|')[1]===g[0];}).sort(function(p,q){return UI.simP0[q]-UI.simP0[p];});
    if(!ks.length)return '';
    var open=!!(UI.simOpen&&UI.simOpen[g[0]]);
    return '<button type="button" class="repbtn" data-a="simOpen" data-v="'+g[0]+'" aria-expanded="'+open+'" style="margin-top:8px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+RC[g[0]]+';margin-right:8px"></i><strong>'+esc(t(g[1]))+'</strong> <span class="muted">'+(open?'▾':'▸')+'</span></span><span class="muted small">'+ks.length+'</span></button>'+(open?ks.map(function(k){return simField(k,simPLabel(k)+' ('+curSym(S.disp)+')');}).join(''):'');
  }).join('');
}
ACT.simOpen=function(v){UI.simOpen=UI.simOpen||{};UI.simOpen[v]=!UI.simOpen[v];render();};
function simInit(){
  var a=r3sum([VM]),R=ruleFor(VM),rent=S.rec.filter(function(r){return r.type==='exp'&&/loyer|rent/.test(norm(r.name));})[0];
  UI.simMonth=VM;UI.sim={inc:fieldVal(a.inc),n:fieldVal(a.n),w:fieldVal(a.w),s:fieldVal(a.s),tn:String(R.n),tw:String(R.w),ts:String(R.s),rent0:rent?numStr(fromEur(eurOf(rent),S.disp)):'',rent1:''};
  UI.simBase={inc:fromEur(a.inc,S.disp),used:fromEur(a.n+a.w+a.s,S.disp)};
  var sp=simPostes();UI.simP0={};Object.keys(sp).forEach(function(k){var v=fromEur(sp[k],S.disp);UI.simP0[k]=v;UI.sim[k]=fieldVal(sp[k]);});
}
function simOut(){
  var q=UI.sim,inc=num(q.inc),w=num(q.w),sv=num(q.s),n=num(q.n),r0=num(q.rent0),r1=num(q.rent1);
  if(String(q.rent1).trim()!==''&&String(q.rent0).trim()!=='')n=n-r0+r1;
  Object.keys(UI.simP0||{}).forEach(function(k){var d=num(q[k])-UI.simP0[k],g=k.split('|')[1];if(!d)return;if(g==='n')n+=d;else if(g==='w')w+=d;else sv+=d;});
  var used=n+w+sv,left=inc-used,base=inc>0?inc:used,b0=UI.simBase,left0=b0.inc-b0.used,dl=left-left0;
  var tn=num(q.tn),tw=num(q.tw),ts=num(q.ts),tt=tn+tw+ts;
  var rows=[['n','ruleN',n,tn,true],['w','ruleW',w,tw,true],['s','ruleS',sv,ts,false]];
  var h='<div class="card"><p class="small muted" style="margin:0">'+esc(t(left>=0?'splitLeftIs':'splitOver'))+'</p><div class="big '+(left>=0?'pos':'neg')+'">'+esc(fmt(Math.abs(left),S.disp))+'</div>';
  if(Math.abs(dl)>=0.005)h+='<p class="'+(dl>=0?'pos':'neg')+'" style="margin:0 0 8px"><strong>'+(dl>=0?'+':'−')+esc(fmt(Math.abs(dl),S.disp))+' / '+esc(t('perMonth'))+' · '+(dl>=0?'+':'−')+esc(fmt(Math.abs(dl*12),S.disp))+' / '+esc(t('perYear'))+'</strong> <span class="muted small">'+esc(t('simVsNow'))+'</span></p>';
  h+=rows.map(function(r){var p=base>0?Math.round(r[2]/base*100):0,diff=r[2]-base*r[3]/100,bad=r[4]?diff>0.5:diff<-0.5;
    return '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+RC[r[0]]+';margin-right:8px"></i><strong>'+esc(t(r[1]))+'</strong></span><span>'+esc(fmt(r[2],S.disp))+' <span class="muted small">'+p+' % / '+r[3]+' %</span></span></div>'+bar(r[3]>0?r[2]/(base*r[3]/100)*100:(r[2]>0?100:0),bad)+'</div>';}).join('');
  if(tt!==100)h+='<p class="small neg" style="margin:10px 0 0">'+esc(t('ruleTotal'))+' '+tt+' %</p>';
  return h+'</div>';
}
function simField(key,label){return '<label class="f" for="sim-'+key+'">'+esc(label)+'</label><input class="in" id="sim-'+key+'" inputmode="decimal" data-sim="'+key+'" value="'+esc(UI.sim[key])+'">';}
function simView(){
  if(!UI.sim||UI.simMonth!==VM)simInit();
  return monthNav()+'<div class="card"><div class="masc-row">'+MASC(48,'scan')+'<h3 style="margin:0">'+esc(t('simT'))+'</h3></div><p class="small muted" style="margin:0 0 4px">'+esc(t('simP'))+'</p>'+
    simField('inc',t('income')+' ('+curSym(S.disp)+')')+simField('n',t('ruleN')+' ('+curSym(S.disp)+')')+simField('w',t('ruleW')+' ('+curSym(S.disp)+')')+simField('s',t('ruleS')+' ('+curSym(S.disp)+')')+
    simPostCard()+
    '<h4 style="margin:16px 0 0">'+esc(t('simTarget'))+'</h4><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"><div>'+simField('tn',t('ruleN')+' %')+'</div><div>'+simField('tw',t('ruleW')+' %')+'</div><div>'+simField('ts',t('ruleS')+' %')+'</div></div>'+
    '<button type="button" class="btn ghost full" data-a="simReset">'+esc(t('simReset'))+'</button></div><div id="simout">'+simOut()+'</div><p class="small muted">'+esc(t('simNote'))+'</p>';
}
ACT.simReset=function(){simInit();render();};
function bilanView(){
  var a=r3sum([VM]),c=a.parts[0].c,h=monthNav()+diagCard(a,c);
  var base=a.inc,pc=base>0?Math.min(100,a.used/base*100):(a.used>0?100:0),left=a.inc-a.used;
  h+='<div class="card"><h3>'+esc(t('txSumTitle'))+'</h3>';
  if(a.inc<=0&&a.used<=0)h+='<p class="muted">'+esc(t('noSpend'))+'</p>';
  else{
    h+=(left>=0?'<p class="muted" style="margin:0">'+esc(t('splitLeftIs'))+'</p><div class="big pos">'+esc(M(left))+'</div>':'<p class="neg" style="margin:0">'+esc(t('splitOver'))+'</p><div class="big neg">'+esc(M(-left))+'</div>')+
      '<div class="stack" style="margin:8px 0"><i style="width:'+pc.toFixed(1)+'%;background:'+(left>=0?'var(--gold,#E8B23A)':'#B5412F')+'"></i></div>'+
      '<div style="display:flex;justify-content:space-between"><span>'+esc(t('income'))+'</span><strong class="pos">'+esc(M(a.inc))+'</strong></div>'+
      '<div style="display:flex;justify-content:space-between;margin-top:6px"><span>'+esc(t('expenses'))+'</span><strong>'+esc(M(a.used))+(base>0?' <span class="muted small">'+Math.round(a.used/base*100)+' %</span>':'')+'</strong></div>';
    if(left>0)h+='<p class="small muted" style="margin-top:10px">'+esc(t('splitHint'))+'</p>';
  }
  h+='</div>'+repCard(a,t('ruleCompare'))+postCard(c);
  if(c.spentAll>0)h+='<div class="card"><h3>'+esc(t('byCat'))+'</h3><div class="donutwrap">'+donut(c.by,c.spentAll)+'<div class="legend" style="flex-direction:column;flex:1;min-width:140px">'+CATS.filter(function(k){return c.by[k]>0;}).map(function(k){return '<span><i style="background:'+CCOL[k]+'"></i>'+esc(t('c_'+k))+' · '+esc(M(c.by[k]))+'</span>';}).join('')+'</div></div></div>';
  var top=c.tx.filter(function(x){return x.type==='exp';}).sort(function(x,y){return y.eur-x.eur;}).slice(0,5);
  if(top.length)h+='<div class="card" style="padding:12px 16px"><h3>'+esc(t('topExp'))+'</h3>'+top.map(function(x){return txRow(x,true);}).join('')+'</div>';
  h+='<div class="card"><h3>'+esc(t('q4'))+'</h3><textarea class="in" id="r-text" placeholder="'+esc(t('reflPh'))+'">'+esc(c.m.reflection)+'</textarea><button type="button" class="btn full" data-a="saveRefl">'+esc(t('saveRefl'))+'</button><button type="button" class="btn ghost full" data-a="tab" data-v="guide" style="margin-top:8px">📚 '+esc(t('guideLink'))+'</button></div>';
  return h+ruleEditor();
}
function globalView(){
  var n=UI.span||1,keys=monthsEnding(VM,n),a=r3sum(keys),h=monthNav();
  h+='<div class="chips sm" style="margin:4px 0 8px">'+[1,2,3,6,12].map(function(k){return chip('span',String(k),n===k,esc(k===12?t('span12'):k+' '+t(k>1?'months':'month1')));}).join('')+'</div>';
  if(n>1)h+='<p class="small muted" style="margin:0 0 8px">'+esc(mlabel(keys[0]))+' → '+esc(mlabel(keys[n-1]))+'</p>';
  h+=repCard(a,t(n>1?'rPeriod':'ruleCompare'));
  var topv=Math.max.apply(null,a.parts.map(function(r){return Math.max(r.inc,r.used);}).concat([1]));
  h+='<div class="card"><h3>'+esc(t('hist6'))+'</h3><div class="hist" style="margin-top:8px">'+a.parts.map(function(r){var pp=r.k.split('-'),lab=new Intl.DateTimeFormat(loc(),{month:'short',year:'2-digit'}).format(new Date(+pp[0],+pp[1]-1,1));
    return '<button type="button" class="link" data-a="goMonth" data-v="'+r.k+'" style="text-align:left">'+esc(lab)+' ›</button><div>'+bar(r.inc/topv*100)+'<div class="bar"><i style="width:'+Math.min(100,r.used/topv*100).toFixed(1)+'%;background:var(--muted)"></i></div><span class="muted">'+esc(t('income'))+' '+esc(M(r.inc))+' · '+esc(t('outflow'))+' '+esc(M(r.used))+'</span></div>';}).join('')+'</div></div>';
  var rate=a.inc>0?(a.inc-a.used+a.s)/a.inc*100:0;
  h+='<div class="card"><h3>'+esc(t('saveRate'))+'</h3><div class="big">'+Math.round(rate)+' %</div><p class="small muted">'+esc(t('saveRateHelp'))+'</p></div>';
  return h+ruleEditor();
}
V.stats=function(){
  var v=UI.sv||'bilan';
  return '<div class="chips" style="margin:0 0 10px">'+chip('sv','bilan',v==='bilan',esc(t('svBilan')))+chip('sv','global',v==='global',esc(t('svGlobal')))+chip('sv','sim',v==='sim',esc(t('svSim')))+'</div>'+(v==='global'?globalView():(v==='sim'?simView():bilanView()));
};
function fcfa(e){return fmt(e*XOF,'XOF');}
function sendList(c){
  var m=c.m,max=m.sendMax,cum=0;
  var l=c.tx.filter(function(x){return x.type==='exp'&&x.cat==='family'&&SENDS.indexOf(x.sub)>=0;}).sort(function(p,q){return p.date<q.date?-1:(p.date>q.date?1:0);});
  if(!l.length)return '<p class="muted">'+esc(t('noSend'))+'</p>';
  return '<div style="padding:0 0 4px">'+l.map(function(x){
    cum+=x.eur;var over=max>0&&cum>max;
    return '<button type="button" class="row" data-a="editTx" data-v="'+x.id+'"><span class="ico">🌍</span><span class="mid"><span class="t">'+esc(x.note||t('c_family'))+'</span><span class="muted small">'+esc(dfmt(x.date))+' · '+esc(t('sn_'+x.sub))+' · '+esc(t('cumul'))+' '+esc(M(cum))+(max>0?' <span class="pill '+(over?'bad':'good')+'">'+esc(t(over?'st_above':'st_in'))+'</span>':'')+'</span></span><span class="amt">−'+esc(fmt(x.amt,x.cur))+'</span></button>';
  }).join('')+'</div>';
}
function sumSend(){
  var c=calcM(VM),m=c.m,sg=suggest(VM),min=m.sendMin,max=m.sendMax,sent=c.sent,ss=sendSummary(c),st=ss.st;
  var h=sendAlert(c)+'<div class="card"><p class="muted" style="margin:0">'+esc(t('sentSoFar'))+'</p><div class="big">'+M2(sent)+'</div>';
  if(st==='none'){
    h+='<p class="muted">'+esc(t('rangeEmpty'))+'</p><button type="button" class="btn full" data-a="editRange">'+esc(t('rangeSet'))+'</button></div>';
  }else{
    h+=rangeBar(sent,min,max)+'<p class="small muted" style="margin:0">'+esc(t('range'))+' '+esc(M(min))+' – '+esc(M(max))+'</p><p style="margin-top:10px"><span class="pill '+ss.cls+'">'+esc(t('st_'+st))+'</span></p>';
    if(st==='below')h+='<p>'+esc(t('toMin'))+' <strong>'+esc(M(min-sent))+'</strong></p>';
    if(st==='in')h+='<p>'+esc(t('leftToMax'))+' <strong>'+esc(M(max-sent))+'</strong></p>';
    if(st==='above')h+='<p class="neg">'+esc(t('overMax'))+' <strong>'+esc(M(sent-max))+'</strong></p>';
    h+='<button type="button" class="btn ghost full" data-a="editRange">'+esc(t('rangeEdit'))+'</button></div>';
  }
  h+='<div class="card"><h3>'+esc(t('sendList'))+'</h3>'+sendList(c)+'<button type="button" class="btn full" data-a="addSend">+ '+esc(t('addSend'))+'</button></div>';
  h+='<div class="card"><h3>'+esc(t('suggest'))+'</h3>';
  if(!(sg.base>0))h+='<p class="muted" style="margin:0">'+esc(t('suggNoData'))+'</p></div>';
  else{
    var sp=sendSplit(VM,sg.max),rp=function(str,o){Object.keys(o).forEach(function(q){str=str.split('{'+q+'}').join(o[q]);});return str;};
    h+='<table><tr><td>'+esc(t('suggMin'))+'</td><td>'+M2(sg.min)+'</td></tr><tr><td>'+esc(t('suggMax'))+'</td><td>'+M2(sg.max)+'</td></tr></table>'+
      '<p class="small" style="margin:10px 0 0">'+esc(rp(t('suggMode_'+sg.mode),{left:M(sg.left),add:M(sg.add),max:M(sg.curMax),over:M(sg.over),def:M(sg.deficit),sug:M(sg.max)}))+'</p>';
    if(sg.mode==='add'||sg.mode==='over'){
      h+='<p class="small" style="margin:10px 0 4px"><strong>'+esc(t('suggSplitT'))+' ('+esc(M(sg.left))+')</strong></p>'+
        '<p class="small" style="margin:2px 0">🌍 '+esc(t('suggToSend'))+' : <strong>'+esc(M(sg.add))+'</strong></p>'+
        '<p class="small" style="margin:2px 0">🎯 '+esc(t('suggToProj'))+' : <strong>'+esc(M(sg.projP))+'</strong></p>'+
        '<p class="small" style="margin:2px 0">🍜 '+esc(t('suggToFree'))+' : <strong>'+esc(M(sg.free))+'</strong></p>';
      if(sg.proj.has&&sg.proj.list.length){
        h+='<div class="note" style="margin-top:10px"><p class="small" style="margin:0 0 4px"><strong>'+esc(t('suggProjT'))+'</strong></p>'+sg.proj.list.map(function(x){return '<p class="small" style="margin:3px 0">'+esc(x.g.emoji||'🎯')+' '+esc(x.g.name)+' : +'+esc(M(x.share))+' / '+esc(t('perMonth'))+' → '+esc(t('suggReach'))+' <strong>'+esc(new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(x.newReach))+'</strong>'+(x.oldReach?' <span class="muted">('+esc(t('suggBefore'))+' '+esc(new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(x.oldReach))+')</span>':'')+'</p>';}).join('')+'<button type="button" class="btn ghost full" data-a="projApply" style="margin-top:8px">'+esc(t('suggProjApply'))+'</button></div>';
      }else if(!sg.proj.has)h+='<p class="small muted" style="margin:8px 0 0">'+esc(t('suggNoProj'))+'</p>';
    }
    if(sg.max>0)h+='<p class="small" style="margin:10px 0 4px"><strong>'+esc(t('suggSplit'))+'</strong></p>'+SENDS.filter(function(x){return sp[x]>0;}).map(function(x){return '<p class="small" style="margin:2px 0">'+esc(t('sn_'+x))+' : '+esc(M(sp[x]))+' <span class="muted">· '+esc(fcfa(sp[x]))+'</span></p>';}).join('');
    var applied=(m.sendMin===sg.min&&m.sendMax===sg.max);
    h+='<button type="button" class="btn full" data-a="useSugg" style="margin-top:10px">'+esc(t(applied?'suggUsed':'useSugg'))+'</button></div>';
  }
  return h;
}
V.send=function(){
  var c=calcM(VM),m=c.m;
  return monthNav()+(c.m.sendMax>0&&c.sent>c.m.sendMax?pageMasc('worry','mascSendWarn'):'<p class="muted">'+esc(t('sendIntro'))+'</p>')+'<div id="sum">'+sumSend()+'</div>'+
    '<div class="card"><h3>'+esc(t('fcfaConv'))+'</h3><label class="f" for="est-in">'+esc(t('amount'))+' ('+curSym(S.disp)+')</label><input class="in" id="est-in" inputmode="decimal" placeholder="0"><p class="big" id="est-out" style="font-size:1.5rem;margin:10px 0 0">≈ '+esc(fcfa(0))+'</p><p class="small muted" style="margin:6px 0 0">'+esc(t('fcfaNote'))+'</p>'+
    '<table style="margin-top:10px"><tr><td>'+esc(t('sentSoFar'))+'</td><td>'+esc(fcfa(c.sent))+'</td></tr>'+(m.sendMax>0?'<tr><td>'+esc(t('fcfaRange'))+'</td><td>'+esc(fcfa(m.sendMin))+' – '+esc(fcfa(m.sendMax))+'</td></tr>':'')+'</table></div>'+'';
};
V.more=function(){
  var items=[['tx','🧾'],['recurring','🔁'],['trips','✈️'],['guide','📚'],['sub','💳'],['settings','⚙️']];
  return '<div class="card" style="padding:4px 16px">'+items.map(function(i){return '<button type="button" class="row" data-a="tab" data-v="'+i[0]+'"><span class="ico">'+i[1]+'</span><span class="mid"><span class="t">'+esc(t(i[0]))+'</span><span class="muted small">'+esc(t('d_'+i[0]))+'</span></span><span class="muted">›</span></button>';}).join('')+'</div>';
};
V.recurring=function(){
  var occ=recOcc(VM),h='<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 2px 10px"><p class="muted" style="margin:0">'+esc(t('recIntro'))+'</p><button type="button" class="link" data-a="addRec">+ '+esc(t('addRec'))+'</button></div>';
  if(!S.rec.length)return h+'<div class="card flat"><p class="muted">'+esc(t('noRec'))+'</p></div>';
  h+='<div class="card" style="padding:4px 16px">'+S.rec.map(function(r){var emo=r.type==='inc'?'💰':(CEMO[r.cat]||'🔁');
    return '<button type="button" class="row" data-a="editRec" data-v="'+r.id+'"><span class="ico">'+emo+'</span><span class="mid"><span class="t">'+esc(r.name)+'</span><span class="muted small">'+esc(t('everyMonth'))+' '+r.day+(r.from?' · '+esc(t('recSince'))+' '+esc(mlabel(r.from)):'')+(r.to?' → '+esc(mlabel(r.to)):'')+'</span></span><span class="amt '+(r.type==='inc'?'pos':'')+'">'+(r.type==='inc'?'+':'−')+esc(fmt(r.amt,r.cur))+'</span></button>';}).join('')+'</div>';
  return h;
};
function guideCountry(){var g=window.GUIDE||{};return g[S.country]?S.country:'FR';}
V.guide=function(){
  var G=window.GUIDE||{},cc=guideCountry(),C=G[cc],L=S.lang==='en'?'en':'fr',h='';
  h+='<div class="note"><p class="small" style="margin:0"><strong>'+esc(t('gdDisc'))+'</strong></p></div>';
  h+='<div class="card"><label class="f" for="g-c" style="margin-top:0">'+esc(t('gdCountry'))+'</label><select class="in" id="g-c" data-gc="1">'+
    [['eu','gdEu'],['en','gdEn']].map(function(r){return '<optgroup label="'+esc(t(r[1]))+'">'+Object.keys(G).filter(function(k){return G[k].reg===r[0];}).map(function(k){return '<option value="'+k+'"'+(k===cc?' selected':'')+'>'+G[k].flag+' '+esc(G[k][L])+'</option>';}).join('')+'</optgroup>';}).join('')+'</select></div>';
  h+='<div class="card"><h3>'+esc(t('gdBeforeT'))+'</h3><ol class="small" style="padding-left:18px;margin:6px 0 0">'+[1,2,3,4,5,6].map(function(n){return '<li style="margin:3px 0">'+esc(t('gdB'+n))+'</li>';}).join('')+'</ol></div>';
  [['safe','gdSafe'],['bal','gdBal'],['grow','gdGrow'],['ret','gdRet'],['real','gdReal']].forEach(function(sc){
    var its=C.sec[sc[0]];if(!its||!its.length)return;
    h+='<div class="card"><h3 style="margin-bottom:2px">'+esc(t(sc[1]))+'</h3><p class="small muted" style="margin:0 0 6px">'+esc(t(sc[1]+'H'))+'</p>'+its.map(function(i){return '<div style="padding:8px 0;border-top:1px solid var(--line)"><strong>'+esc(i.n)+'</strong><p class="small" style="margin:2px 0 0">'+esc(i[L])+'</p></div>';}).join('')+'</div>';
  });
  h+='<div class="card"><h3>'+esc(t('gdSrc'))+' · '+C.flag+' '+esc(C[L])+'</h3><p class="small muted" style="margin:0 0 6px">'+esc(t('gdSrcH'))+'</p>'+C.src.map(function(r){return '<p style="margin:4px 0"><a href="'+esc(r[1])+'" target="_blank" rel="noopener">'+esc(r[0])+' ↗</a></p>';}).join('')+'</div>';
  h+='<div class="note"><p class="small" style="margin:0">'+esc(t('gdCrypto'))+'</p></div>';
  return h;
};
V.trips=function(){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 2px 10px"><p class="muted" style="margin:0">'+esc(t('tripIntro'))+'</p><button type="button" class="link" data-a="addTrip">+ '+esc(t('addTrip'))+'</button></div>';
  if(!S.trips.length)return h+'<div class="card flat"><p class="muted">'+esc(t('noTrip'))+'</p></div>';
  S.trips.slice().reverse().forEach(function(tr){
    var tx=S.tx.filter(function(x){return x.trip===tr.id;}),spentE=sum(tx,function(x){return x.eur;}),spent=fromEur(spentE,tr.cur),left=tr.budget-spent;
    h+='<div class="card"><h3>✈️ '+esc(tr.name)+(tr.active?' <span class="pill good">'+esc(t('tripActive'))+'</span>':'')+'</h3>'+bar(tr.budget>0?spent/tr.budget*100:0,left<0)+
      '<table><tr><td>'+esc(t('tripSpent'))+'</td><td>'+esc(fmt(spent,tr.cur))+' <span class="muted">('+esc(fmt(spentE,'EUR'))+')</span></td></tr><tr><td>'+esc(t('tripLeft'))+'</td><td class="'+(left>=0?'pos':'neg')+'">'+esc(fmt(left,tr.cur))+'</td></tr></table>';
    var pays=['cash','card','momo'].map(function(p){var v=sum(tx.filter(function(x){return x.pay===p;}),function(x){return x.eur;});return v>0?'<tr><td>'+esc(t('p_'+p))+'</td><td>'+esc(fmt(fromEur(v,tr.cur),tr.cur))+'</td></tr>':'';}).join('');
    if(pays)h+='<p class="small muted" style="margin:10px 0 2px">'+esc(t('tripByPay'))+'</p><table>'+pays+'</table>';
    h+='<div class="btns"><button type="button" class="btn ghost" data-a="toggleTrip" data-v="'+tr.id+'">'+esc(tr.active?t('tripEnd'):t('tripResume'))+'</button><button type="button" class="btn ghost" data-a="delTrip" data-v="'+tr.id+'">'+esc(t('tripDel'))+'</button></div></div>';
  });
  return h;
};
V.review=function(){
  var c=calcM(VM),m=c.m,real=c.income-c.fixed-c.variable,ss=sendSummary(c);
  var h=monthNav();
  h+='<div class="card"><h3>'+esc(t('q1'))+'</h3><table><tr><td>'+esc(t('income'))+'</td><td>'+M2(c.income)+'</td></tr><tr><td>'+esc(t('fixed'))+'</td><td>'+M2(c.fixed)+'</td></tr><tr><td><strong>'+esc(t('q1a'))+'</strong></td><td>'+M2(c.income-c.fixed)+'</td></tr></table></div>';
  h+='<div class="card"><h3>'+esc(t('q2'))+'</h3><table><tr><td>'+esc(t('q2goal'))+'</td><td>'+M2(m.saving)+'</td></tr><tr><td>'+esc(t('q2real'))+'</td><td class="'+(real>=m.saving?'pos':'neg')+'">'+M2(real)+'</td></tr></table></div>';
  h+='<div class="card"><h3>'+esc(t('q3'))+'</h3><table>'+CATS.map(function(k){return '<tr><td>'+CEMO[k]+' '+esc(t('c_'+k))+'</td><td>'+esc(M(c.by[k]))+'</td></tr>';}).join('')+'<tr><td><strong>'+esc(t('expenses'))+'</strong></td><td><strong>'+esc(M(c.spentAll))+'</strong></td></tr></table>'+
    '<p style="margin-top:10px">'+esc(t('sendsVs'))+' : <strong>'+esc(M(c.sent))+'</strong> · '+esc(t('range'))+' '+esc(M(m.sendMin))+' – '+esc(M(m.sendMax))+' <span class="pill '+ss.cls+'">'+esc(t('st_'+ss.st))+'</span></p></div>';
  h+='<div class="card"><h3>'+esc(t('q4'))+'</h3><textarea class="in" id="r-text" placeholder="'+esc(t('reflPh'))+'">'+esc(m.reflection)+'</textarea><button type="button" class="btn full" data-a="saveRefl">'+esc(t('saveRefl'))+'</button><button type="button" class="btn ghost full" data-a="tab" data-v="guide" style="margin-top:8px">📚 '+esc(t('guideLink'))+'</button></div>';
  return h;
};
V.settings=function(){
  var json=JSON.stringify(S);
  var acct='';
  if(cloud())acct=AUTH.session?'<div class="card"><h3>'+esc(t('acct'))+'</h3><p style="margin:6px 0">'+esc(AUTH.session.email||'')+'</p><p class="small muted" id="syncl">'+esc(t('sync_'+(AUTH.sync||'ok')))+'</p><button type="button" class="btn ghost full" data-a="logout">'+esc(t('logout'))+'</button></div>':'<div class="card"><h3>'+esc(t('acct'))+'</h3><p class="muted small">'+esc(t('guestNote'))+'</p><button type="button" class="btn full" data-a="goAuth">'+esc(t('signin'))+'</button></div>';
  return acct+'<div class="card"><h3>'+esc(t('lang'))+'</h3><div class="chips" style="margin-top:8px">'+['fr','en'].map(function(l){return chip('lang',l,S.lang===l,l==='fr'?'Français':'English');}).join('')+'</div></div>'+
    '<div class="card"><h3>'+esc(t('rateTitle'))+'</h3><p class="muted small">'+esc(t('rateFixed'))+'</p><p class="big" style="font-size:1.5rem;margin:8px 0">1 € = '+esc(numStr(S.rates.usd,4))+' $</p>'+
    '<p class="small muted">'+esc(S.rates.updated?t('rateUpd')+' '+dfmt(S.rates.updated)+(S.rates.auto?' · '+t('rateAuto'):''):t('rateBackup'))+'</p>'+
    '<button type="button" class="btn ghost full" data-a="rateNow">'+esc(t('rateNow'))+'</button><a class="small" href="'+ECB+'" target="_blank" rel="noopener">'+esc(t('rateLink'))+'</a></div>'+
    '<div class="card"><h3>'+esc(t('exportCsv'))+'</h3><button type="button" class="btn ghost full" style="margin-top:8px" data-a="csv">'+esc(t('exportCsv'))+'</button>'+(UI.csv?'<textarea class="in" id="csv-out" readonly style="margin-top:10px">'+esc(UI.csv)+'</textarea><button type="button" class="btn full" data-a="copyCsv">'+esc(t('copy'))+'</button>':'')+'</div>'+
    '<div class="card"><h3>'+esc(t('backup'))+'</h3><p class="muted small">'+esc(t('backupHint'))+'</p><textarea class="in" id="bk-out" readonly aria-label="'+esc(t('backup'))+'">'+esc(json)+'</textarea><button type="button" class="btn full" data-a="copyBk">'+esc(t('copy'))+'</button>'+
    '<label class="f" for="bk-in">'+esc(t('restore'))+'</label><textarea class="in" id="bk-in" placeholder="'+esc(t('restorePh'))+'"></textarea><button type="button" class="btn ghost full" data-a="restoreBk">'+esc(t('restore'))+'</button><p class="small" id="bk-msg">'+esc(UI.restoreMsg)+'</p></div>'+
    '<div class="card"><h3>'+esc(t('privTitle'))+'</h3><p class="muted small">'+esc(t('privShort'))+'</p><button type="button" class="btn ghost full" data-a="privacy">'+esc(t('privOpen'))+'</button><button type="button" class="btn ghost full" data-a="legal">'+esc(t('legalOpen'))+'</button></div>'+
    (cloud()&&AUTH.session?'<div class="card"><h3>'+esc(t('delUserT'))+'</h3><p class="muted small">'+esc(t('delUserP'))+'</p>'+(UI.confirmDelUser?'<p class="small neg"><strong>'+esc(t('delUserSure'))+'</strong></p><div class="btns"><button type="button" class="btn danger" data-a="delUserDo"'+(UI.delBusy?' disabled':'')+'>'+esc(t('delUserYes'))+'</button><button type="button" class="btn ghost" data-a="delUserNo">'+esc(t('delAccCancel'))+'</button></div>':'<button type="button" class="btn ghost full" data-a="delUser">'+esc(t('delUserT'))+'</button>')+(UI.delMsg?'<p class="small neg" role="alert">'+esc(UI.delMsg)+'</p>':'')+'</div>':'')+
    '<div class="card"><button type="button" class="btn '+(UI.confirmReset?'danger':'ghost')+' full" style="margin-top:0" data-a="resetAll">'+esc(UI.confirmReset?t('resetConfirm'):t('reset'))+'</button></div>';
};


V.gateCard=function(){
  var up=AUTH.mode==='up';
  if(AUTH.mode==='forgot')return '<section class="card gate-card"><h1 style="font-family:var(--display);margin:0 0 4px">MONEY RESET</h1><p class="muted" style="margin:0 0 14px">'+esc(t('forgotSub'))+'</p>'+
    '<label class="f" for="g-email">'+esc(t('email'))+'</label><input class="in" id="g-email" type="email" autocomplete="email" inputmode="email" value="'+esc(AUTH.email||'')+'">'+
    '<p class="small" id="g-msg" role="alert" style="min-height:1.2em;margin:8px 0">'+esc(AUTH.msg)+'</p>'+
    '<button type="button" class="btn full" data-a="forgotGo"'+(AUTH.busy?' disabled':'')+'>'+esc(t('forgotSend'))+'</button>'+
    '<button type="button" class="btn ghost full" data-a="authMode" data-v="in">'+esc(t('back'))+'</button></section>';
  if(AUTH.mode==='reset')return '<section class="card gate-card"><h1 style="font-family:var(--display);margin:0 0 4px">MONEY RESET</h1><p class="muted" style="margin:0 0 14px">'+esc(t('newPassSub'))+'</p>'+
    '<label class="f" for="g-pass">'+esc(t('newPass'))+'</label><input class="in" id="g-pass" type="password" autocomplete="new-password">'+
    '<p class="small" id="g-msg" role="alert" style="min-height:1.2em;margin:8px 0">'+esc(AUTH.msg)+'</p>'+
    '<button type="button" class="btn full" data-a="resetGo"'+(AUTH.busy?' disabled':'')+'>'+esc(t('newPassGo'))+'</button></section>';
  return '<section class="card gate-card"><div class="masc-row">'+MASC(64)+'<h1 style="font-family:var(--display);margin:0">MONEY RESET</h1></div><p class="muted" style="margin:0 0 14px">'+esc(t('authSub'))+'</p>'+
    '<div class="chips" style="margin-bottom:6px">'+chip('authMode','in',!up,esc(t('signin')))+chip('authMode','up',up,esc(t('signup')))+'</div>'+
    '<label class="f" for="g-email">'+esc(t('email'))+'</label><input class="in" id="g-email" type="email" autocomplete="email" inputmode="email">'+
    '<label class="f" for="g-pass">'+esc(t('password'))+'</label><input class="in" id="g-pass" type="password" autocomplete="'+(up?'new-password':'current-password')+'">'+
    (up?'<label class="small" style="display:flex;gap:10px;align-items:flex-start;margin:10px 0 0"><input type="checkbox" data-a="consent" '+(AUTH.consent?'checked ':'')+'style="margin-top:3px;width:20px;height:20px"> <span>'+esc(t('consentTxt'))+' <button type="button" class="link" data-a="privacy" style="padding:0">'+esc(t('privOpen'))+'</button></span></label>':'<p class="small" style="margin:10px 0 0"><button type="button" class="link" data-a="authMode" data-v="forgot" style="padding:0">'+esc(t('forgot'))+'</button> · <button type="button" class="link" data-a="privacy" style="padding:0">'+esc(t('privOpen'))+'</button></p>')+'<p class="small" id="g-msg" role="alert" style="min-height:1.2em;margin:8px 0">'+esc(AUTH.msg)+'</p>'+
    '<button type="button" class="btn full" data-a="authGo"'+(AUTH.busy?' disabled':'')+'>'+esc(up?t('signup'):t('signin'))+'</button>'+
    '<button type="button" class="btn ghost full" data-a="guest">'+esc(t('guest'))+'</button><p class="small muted">'+esc(t('guestNote'))+'</p></section>';
};
V.gate=function(){
  var F6=[['🎯','1'],['🌍','2'],['🏡','3'],['📄','4'],['📊','5'],['📚','6']];
  var hero='<header class="lp-hero"><div class="lp-top"><span class="gate-logo">MONEY RESET</span><div class="gate-lang" role="group" aria-label="Langue / Language">'+['fr','en'].map(function(l){return chip('lang',l,S.lang===l,l==='fr'?'Français':'English');}).join('')+'</div></div>'+
    '<div class="lp-tag">'+esc(t('lpTag'))+'</div><h1 class="lp-h">'+esc(t('lpH'))+'</h1><p class="lp-sub">'+esc(t('lpSub'))+'</p>'+
    '<div class="lp-cta"><button type="button" class="btn" data-a="lpAuth" data-v="up">'+esc(t('lpCta1'))+'</button><button type="button" class="btn ghost" data-a="guest">'+esc(t('lpCta2'))+'</button></div>'+
    '<p class="small lp-have"><button type="button" class="link" data-a="lpAuth" data-v="in" style="padding:0">'+esc(t('lpCta3'))+'</button></p>'+
    '<div class="lp-pills">'+['lpP0','lpP1','lpP2','lpP3'].map(function(k){return '<span>'+esc(t(k))+'</span>';}).join('')+'</div><div class="lp-masc">'+MASC(150,'wave')+'</div></header>';
  var feat='<section class="lp-feat"><h2>'+esc(t('lpFeatT'))+'</h2><div class="lp-grid">'+F6.map(function(f){return '<div class="lp-fc"><span class="gi" aria-hidden="true">'+f[0]+'</span><h3>'+esc(t('lpF'+f[1]+'T'))+'</h3><p>'+esc(t('lpF'+f[1]+'D'))+'</p></div>';}).join('')+'</div></section>';
  var how='<section class="lp-how"><h2>'+esc(t('lpHowT'))+'</h2><ol>'+[1,2,3].map(function(n){return '<li><span class="n">'+n+'</span><div><strong>'+esc(t('lpS'+n+'T'))+'</strong><p>'+esc(t('lpS'+n+'D'))+'</p></div></li>';}).join('')+'</ol><p class="small muted" style="margin:14px 0 0">📱💻 '+esc(t('lpDev'))+'</p></section>';
  var priv='<section class="lp-priv"><span class="gi" aria-hidden="true">🔒</span><div><h2>'+esc(t('lpPrivT'))+'</h2><p>'+esc(t('lpPrivD'))+'</p><p class="small muted" style="margin:8px 0 0">'+esc(t('lpDisc'))+'</p></div></section>';
  return '<div class="gate">'+hero+'<div class="gate-main" id="g-card">'+V.gateCard()+((AUTH.mode==='in'||AUTH.mode==='up')?fbCard():'')+'</div>'+feat+how+priv+'</div>';
};

/* ---------- shell ---------- */
function hdrHtml(){
  var sub=SUBTABS.indexOf(TAB)>=0,back=TAB==='more'?'home':'more';
  return (sub?'<button type="button" class="back" data-a="tab" data-v="'+back+'" aria-label="'+esc(t('back'))+'">‹</button>':'')+'<h1>'+esc(t(TAB))+'</h1>'+
    '<div class="seg" role="group" aria-label="'+esc(t('display'))+'">'+CURS.map(function(c){return '<button type="button" data-a="disp" data-v="'+c+'" aria-pressed="'+(S.disp===c?'true':'false')+'">'+curSym(c)+'</button>';}).join('')+'</div>'+
    (sub?'':'<button type="button" class="icon" data-a="tab" data-v="more" aria-label="'+esc(t('more'))+'">⋯</button>');
}
function barHtml(){
  function nb(k){return '<button type="button" class="nb" data-a="tab" data-v="'+k+'"'+(TAB===k?' aria-current="page"':'')+'><span class="ni" aria-hidden="true">'+NAVEMO[k]+'</span><span class="nl">'+esc(t('nav_'+k))+'</span></button>';}
  return nb('home')+nb('goals')+'<button type="button" class="fab" data-a="addMenu" aria-label="'+esc(t('addTx'))+'">+</button>'+nb('cal')+nb('stats')+nb('send');
}
function render(){
  document.documentElement.lang=S.lang;
  if(needGate()){
    var em=($('g-email')||{}).value,pw=($('g-pass')||{}).value;
    $('hdr').innerHTML='';$('bar').innerHTML='';$('view').setAttribute('data-tab','gate');$('view').innerHTML=V.gate();
    if($('g-email')&&em)$('g-email').value=em;if($('g-pass')&&pw)$('g-pass').value=pw;return;
  }
  if(!S.objDone&&!(cloud()&&AUTH.session&&!AUTH.pulled)){$('hdr').innerHTML='';$('bar').innerHTML='';$('view').setAttribute('data-tab','onboard');$('view').innerHTML=V.onboard();return;}
  $('hdr').innerHTML=hdrHtml();
  $('view').setAttribute('data-tab',TAB);
  $('view').innerHTML=banners()+(V[TAB]?V[TAB]():'');
  $('bar').innerHTML=barHtml();
  if(UI.focus){var f=$(UI.focus);if(f)f.focus();UI.focus='';}
}
function refresh(){var el=$('sum');if(el&&TAB==='send')el.innerHTML=sumSend();}

/* ---------- sheets ---------- */
function sheetHtml(){
  return '<div class="scrim" data-a="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="'+esc(SH.title)+'"><div class="grab"></div><div class="sh-head"><h2>'+esc(SH.title)+'</h2><button type="button" class="icon" data-a="closeSheet" aria-label="'+esc(t('close'))+'">×</button></div>'+SH.build()+'</div>';
}
function openSheet(title,build){SH={title:title,build:build};var r=$('sheet');r.innerHTML=sheetHtml();r.className='on';}
function redrawSheet(){if(!SH)return;var r=$('sheet'),old=r.querySelector('.sheet'),top=old?old.scrollTop:0;r.innerHTML=sheetHtml();var nw=r.querySelector('.sheet');if(nw)nw.scrollTop=top;}
function closeSheet(){SH=null;F=null;var r=$('sheet');r.className='';r.innerHTML='';}
function accSelect(field,val,withNone){
  if(!S.accounts.length)return '<p class="muted small" style="margin:2px 0 6px">'+esc(t('noAccHint'))+'</p><input class="in" id="s-accNew" data-s="accNew" value="'+esc((F&&F.accNew)||'')+'" placeholder="'+esc(t('accNewPh'))+'">';
  return '<select class="in" id="s-'+field+'" data-s="'+field+'">'+(withNone?'<option value="">'+esc(t('noAcc'))+'</option>':'')+S.accounts.map(function(a){return '<option value="'+a.id+'"'+(a.id===val?' selected':'')+'>'+esc(a.name)+' ('+curLabel(a.cur)+')</option>';}).join('')+'</select>';
}
function ensureAcc(){
  if(!F)return;
  var isNew=(F.acc==='__new')||(!F.acc&&!S.accounts.length);if(!isNew)return;
  var n=(F.accNew||'').trim(),ty=ATYPES.indexOf(F.atype)>=0?F.atype:'bank';
  if(!n&&F.acc==='__new')n=t('at_'+ty);
  if(!n){F.acc='';return;}
  var id=uid();S.accounts.push({id:id,name:n,type:ty,cur:(F.cur&&CURS.indexOf(F.cur)>=0)?F.cur:'EUR',open:0,since:ymd(new Date())});F.acc=id;
}
function monthSel(field,label,optional){
  var v=F[field]||'',y=v?+v.slice(0,4):0,m=v?+v.slice(5,7):0,cy=new Date().getFullYear(),ys=[];
  for(var i=cy-3;i<=cy+10;i++)ys.push(i);
  var mo=[];for(var k=1;k<=12;k++)mo.push(new Intl.DateTimeFormat(loc(),{month:'long'}).format(new Date(2024,k-1,1)));
  return '<label class="f">'+esc(label)+'</label><div style="display:grid;grid-template-columns:3fr 2fr;gap:8px"><select class="in" data-ms="'+field+'" data-p="m">'+(optional?'<option value="">—</option>':'')+mo.map(function(n,i){return '<option value="'+(i+1)+'"'+(m===i+1?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select><select class="in" data-ms="'+field+'" data-p="y">'+(optional?'<option value="">—</option>':'')+ys.map(function(n){return '<option value="'+n+'"'+(y===n?' selected':'')+'>'+n+'</option>';}).join('')+'</select></div>';
}
function msChange(el){
  var f=el.getAttribute('data-ms'),p=el.getAttribute('data-p'),v=F[f]||'',y=v?v.slice(0,4):'',m=v?v.slice(5,7):'';
  if(p==='y')y=el.value;else m=el.value?pad(+el.value):'';
  if(!y&&!m)F[f]='';else{if(!y)y=String(new Date().getFullYear());if(!m)m='01';F[f]=y+'-'+m;}
  redrawSheet();
}
function inp(id,field,label,ph,extra){return '<label class="f" for="'+id+'">'+esc(label)+'</label><input class="in" id="'+id+'" data-s="'+field+'" value="'+esc(F[field])+'" placeholder="'+esc(ph||'')+'" '+(extra||'')+'>';}
function btnRow(saveAct,delAct){return '<div class="btns" style="grid-template-columns:'+(delAct?'1fr 1fr':'1fr')+'"><button type="button" class="btn" data-a="'+saveAct+'">'+esc(t('save'))+'</button>'+(delAct?'<button type="button" class="btn ghost" data-a="'+delAct+'">'+esc(t('del'))+'</button>':'')+'</div>';}

function postField(mode,cat,val){
  var L=postList(mode,cat);if(!L.length)return '';
  var opt=function(k){return '<option value="'+k+'"'+(val===k?' selected':'')+'>'+esc(t('po_'+k))+'</option>';};
  var body=mode==='inc'?L.map(opt).join(''):(POSTG[cat]||[]).map(function(g){return '<optgroup label="'+esc(t(g[0]))+'">'+g[1].map(opt).join('')+'</optgroup>';}).join('');
  return '<label class="f" for="s-post">'+esc(t(mode==='inc'?'incSource':'poste'))+'</label><select class="in" id="s-post" data-s="post"><option value="">'+esc(t('posteNone'))+'</option>'+body+'</select>';
}
function txForm(){
  var tr=activeTrip(),h='<div class="chips" style="margin:6px 0 4px">'+['exp','inc','tr'].map(function(m){return sfchip('mode',m,esc(t('m_'+m)));}).join('')+'</div>';
  h+='<label class="f" for="s-amt">'+esc(t('amount'))+'</label><input class="in amtbig" id="s-amt" data-s="amt" inputmode="decimal" placeholder="0" value="'+esc(F.amt)+'"><div class="chips" style="margin-top:8px">'+CURS.map(function(c){return sfchip('cur',c,curLabel(c));}).join('')+'</div>';
  if(F.mode==='exp'){
    h+='<label class="f">'+esc(t('category'))+'</label><div class="chips">'+CATS.map(function(k){return sfchip('cat',k,CEMO[k]+' '+esc(t('c_'+k)),k==='family'?'gold':'');}).join('')+'</div><p class="small muted" style="margin-top:6px">'+esc(t('h_'+F.cat))+'</p>'+postField('exp',F.cat,F.post);
    if(F.cat==='family')h+='<label class="f">'+esc(t('how'))+'</label><div class="chips">'+SUBS.map(function(s){return sfchip('sub',s,esc(t('s_'+s)));}).join('')+'</div>'+inp('s-fee','fee',t('feeF')+' ('+curSym(F.cur)+')','0','inputmode="decimal"');
  }
  if(F.mode==='inc')h+=postField('inc','',F.post);
  if(F.mode==='tr')h+='<label class="f" for="s-acc">'+esc(t('fromAcc'))+'</label>'+accSelect('acc',F.acc,false)+'<label class="f" for="s-to">'+esc(t('toAcc'))+'</label>'+accSelect('to',F.to,false);
  else h+='<label class="f" for="s-acc">'+esc(t('account'))+'</label>'+accSelect('acc',F.acc,true);
  if(F.mode==='exp'&&tr)h+='<label class="f">'+esc(t('tripFor'))+' '+esc(tr.name)+'</label><div class="chips">'+chip('st','trip',!!F.trip,esc(t('tripToggle')))+'</div>'+(F.trip?'<div class="chips" style="margin-top:8px">'+['cash','card','momo'].map(function(p){return sfchip('pay',p,esc(t('p_'+p)));}).join('')+'</div>':'');
  h+=inp('s-note','note',t('noteF'))+(F.monthOnly?'<label class="f" for="s-datem">'+esc(t('periodF'))+'</label><input class="in" id="s-datem" data-s="dateM" type="month" value="'+esc(F.dateM||String(F.date||'').slice(0,7))+'">':inp('s-date','date',t('dateF'),'','type="date"'))+'<div class="chips" style="margin-top:8px">'+chip('st','monthOnly',!!F.monthOnly,esc(t('monthOnly')))+'</div><p class="small muted" style="margin:4px 0 0">'+esc(t('periodHelp'))+'</p>';
  if(!F.id&&F.mode!=='tr')h+='<div class="chips" style="margin-top:12px">'+chip('st','rec',!!F.rec,'🔁 '+esc(t(F.mode==='inc'?'recIncOpt':'recOpt')))+'</div><p class="small muted" style="margin:6px 0 0">'+esc(t('recOptHelp'))+'</p><p class="small pos" id="rec-hint" style="margin:4px 0 0"></p>';
  if(F.pending||(F.date&&F.date>ymd(new Date())))h+='<div class="chips" style="margin-top:12px">'+chip('st','pending',!!F.pending,esc(t('pendingOpt')))+'</div><p class="small muted" style="margin:6px 0 0">'+esc(t('pendingHelp'))+'</p>';
  return h+btnRow('saveTx',F.id?'delTx':'');
}
function delBox(){
  var id=F.id||F.accId,a=acc(id),n=S.tx.filter(function(x){return x.acc===id;}).length;
  return '<div class="note bad" style="margin-top:12px"><p><strong>'+esc(t('delAccQ'))+' « '+esc(a?a.name:'')+' » ?</strong></p><p class="small">'+esc(t('delAccInfo'))+' ('+n+' '+esc(t('delAccOps'))+')</p></div>'+
    '<div class="btns" style="grid-template-columns:1fr"><button type="button" class="btn ghost" data-a="delAccDo" data-v="keep">'+esc(t('delAccKeep'))+'</button>'+(n?'<button type="button" class="btn danger" data-a="delAccDo" data-v="all">'+esc(t('delAccAll'))+' ('+n+')</button>':'')+'<button type="button" class="btn ghost" data-a="delAccNo">'+esc(t('delAccCancel'))+'</button></div>';
}
function accForm(){
  var h='<label class="f">'+esc(t('accType'))+'</label><div class="chips">'+ATYPES.map(function(k){return sfchip('type',k,AEMO[k]+' '+esc(t('at_'+k)));}).join('')+'</div>'+
    inp('s-name','name',t('name'))+'<label class="f">'+esc(t('currency'))+'</label><div class="chips">'+CURS.map(function(c){return sfchip('cur',c,curLabel(c));}).join('')+'</div>'+
    inp('s-open','open',F.type==='loan'?t('loanLeft'):t('startBal'),'0','inputmode="decimal"');
  if(F.id&&F.delStep)return h+delBox();
  return h+btnRow('saveAcc',F.id?'delAcc':'');
}
function accDetail(){
  var a=acc(F.accId);if(!a)return '';
  var b=accBal(a),h='<div class="big">'+esc(fmt(b,a.cur))+'</div><p class="muted">'+AEMO[a.type]+' '+esc(t('at_'+a.type))+(a.cur!==S.disp?' · '+esc(M(toEur(b,a.cur))):'')+'</p>';
  h+='<h3 style="margin-top:14px">'+esc(t('reconcile'))+'</h3><p class="small muted">'+esc(t('reconcileHelp'))+'</p>'+inp('s-real','real',t('realBal')+' ('+curSym(a.cur)+')','','inputmode="decimal"')+'<button type="button" class="btn ghost full" data-a="recCalc">'+esc(t('compute'))+'</button>';
  if(F.diff!==null){
    var df=F.diff;
    if(Math.abs(df)<0.005)h+='<p style="margin-top:12px"><span class="pill good">'+esc(t('match'))+'</span></p>';
    else if(df<0)h+='<div class="note" style="margin-top:12px"><p><strong>'+esc(t('unexpl'))+' : '+esc(fmt(-df,a.cur))+'</strong></p><p class="small">'+esc(t('unexplHelp'))+'</p><div class="chips">'+CATS.map(function(k){return sfchip('dcat',k,CEMO[k]+' '+esc(t('c_'+k)));}).join('')+'</div><div class="acts"><button type="button" class="btn" data-a="addDiff">'+esc(t('addDiff'))+'</button></div></div>';
    else h+='<div class="note" style="margin-top:12px"><p><strong>'+esc(t('higher'))+' '+esc(fmt(df,a.cur))+'</strong></p><p class="small">'+esc(t('higherHelp'))+'</p><div class="acts"><button type="button" class="btn" data-a="addDiff">'+esc(t('addIncome'))+'</button></div></div>';
  }
  if(F.delStep)return h+delBox();
  return h+'<div class="btns"><button type="button" class="btn ghost" data-a="editAcc" data-v="'+a.id+'">'+esc(t('edit'))+'</button><button type="button" class="btn ghost" data-a="closeSheet">'+esc(t('close'))+'</button></div><button type="button" class="btn ghost full" data-a="delAcc" style="margin-top:8px">'+esc(t('delAcc'))+'</button>';
}
var GTYPES={travel:'✈️',build:'🏗️',buy:'🛍️',save:'🐷',invest:'📈',other:'🎯'},NEEDDATE=['travel','build','buy'];
function goalForm(){
  var nd=NEEDDATE.indexOf(F.gtype)>=0,mk=F.gdate||'';
  return '<label class="f">'+esc(t('gType'))+'</label><div class="chips">'+Object.keys(GTYPES).map(function(k){return sfchip('gtype',k,GTYPES[k]+' '+esc(t('gt_'+k)));}).join('')+'</div>'+inp('s-gname','name',t('name'))+inp('s-gemo','emoji',t('emoji'),'🎯','maxlength="4"')+inp('s-gt','target',t('target')+' ('+curSym(F.cur)+')','','inputmode="decimal"')+'<label class="f">'+esc(t('currency'))+'</label><div class="chips">'+CURS.map(function(c){return sfchip('cur',c,curLabel(c));}).join('')+'</div>'+'<label class="f" for="s-gdate">'+esc(t('gDate'))+(nd?' *':'')+'</label><input class="in" id="s-gdate" data-s="gdate" type="month" value="'+esc(mk)+'">'+'<p class="small muted" style="margin:4px 0 0">'+esc(t('goalYearsH'))+'</p>'+
    inp('s-gc','current',t('savedSoFar'),'0','inputmode="decimal"')+inp('s-gm','monthly',t('monthlyDep'),'0','inputmode="decimal"')+((F.gtype==='save'||F.gtype==='invest'||F.gtype==='other')?inp('s-gr','rate',t('annualRet'),'0','inputmode="decimal"')+inp('s-gi','infl',t('inflation')+' (%)','0','inputmode="decimal"'):'')+btnRow('saveGoal',F.id?'delGoal':'');
}
function depForm(){
  var g=S.goals.filter(function(x){return x.id===F.gid;})[0];
  return '<p class="muted">'+esc(g?g.name:'')+'</p>'+inp('s-dep','amt',t('amount')+' ('+curSym(g?g.cur:'EUR')+')','0','inputmode="decimal"')+btnRow('saveDep','');
}
function recForm(){
  var h='<div class="chips" style="margin:6px 0 4px">'+['exp','inc'].map(function(m){return sfchip('rtype',m,esc(t('m_'+m)));}).join('')+'</div>'+inp('s-rname','name',t('name'))+inp('s-ramt','amt',t('amount')+' ('+curSym(F.cur)+')','0','inputmode="decimal"')+'<div class="chips" style="margin-top:8px">'+CURS.map(function(c){return sfchip('cur',c,curLabel(c));}).join('')+'</div>'+inp('s-rday','day',t('dayOfMonth'),'1','inputmode="numeric"')+monthSel('from',t('recFrom'),false)+monthSel('to',t('recTo'),true)+'';
  if(F.rtype==='exp'){
    h+='<label class="f">'+esc(t('category'))+'</label><div class="chips">'+CATS.map(function(k){return sfchip('cat',k,CEMO[k]+' '+esc(t('c_'+k)),k==='family'?'gold':'');}).join('')+'</div>'+postField('exp',F.cat,F.post);
    if(F.cat==='family')h+='<label class="f">'+esc(t('how'))+'</label><div class="chips">'+SUBS.map(function(s){return sfchip('sub',s,esc(t('s_'+s)));}).join('')+'</div>';
  }else h+=postField('inc','',F.post);
  h+='<label class="f" for="s-acc">'+esc(t('account'))+'</label>'+accSelect('acc',F.acc,true);
  return h+btnRow('saveRec',F.id?'delRec':'');
}
function envForm(){
  var h='<p class="small muted">'+esc(t('fieldsNote'))+'</p>'+inp('s-esave','saving',t('savingGoal')+' ('+curSym(S.disp)+')','0','inputmode="decimal"');
  SPEND.forEach(function(k){h+=inp('s-e-'+k,k,CEMO[k]+' '+t('c_'+k)+' ('+curSym(S.disp)+')','0','inputmode="decimal"');});
  return h+btnRow('saveEnv','');
}
function tripForm(){
  return inp('s-tname','name',t('tripName'))+'<label class="f">'+esc(t('tripCur'))+'</label><div class="chips">'+CURS.map(function(c){return sfchip('cur',c,curLabel(c));}).join('')+'</div>'+inp('s-tb','budget',t('tripBudget')+' ('+curSym(F.cur)+')','0','inputmode="decimal"')+btnRow('saveTrip','');
}

/* ---------- actions ---------- */

ACT.tab=function(v){if(v==='home')VM=ym(new Date());TAB=v;UI.confirmReset=false;render();window.scrollTo(0,0);};
ACT.goCat=function(k){TAB='tx';UI.tf='exp';UI.tc=k;render();window.scrollTo(0,0);};
ACT.goFlow=function(f){TAB='tx';UI.tf=f;UI.tc='all';render();window.scrollTo(0,0);};
ACT.fbStar=function(v){var f=UI.fb||(UI.fb={r:0,txt:'',done:false,busy:false}),ta=$('fb-text');if(ta)f.txt=ta.value;f.r=(f.r===+v)?0:+v;render();};
ACT.fbSend=function(){
  var f=UI.fb||(UI.fb={r:0,txt:'',done:false,busy:false}),ta=$('fb-text');if(ta)f.txt=ta.value;
  var msg=f.txt.trim().slice(0,2000);if(!f.r&&!msg){toast(t('fbEmpty'),true);return;}
  if(f.busy)return;f.busy=true;
  var body={rating:f.r||null,message:msg||null,lang:S.lang==='en'?'en':'fr'};
  var go=function(tk){return api('/rest/v1/mr_feedback',{method:'POST',prefer:'return=minimal',body:body},tk);};
  (AUTH.session?token().then(go,function(){return go();}):go()).then(function(){f.done=true;f.busy=false;render();},function(){f.busy=false;render();toast(t('fbErr'),true);});
};
ACT.goMonth=function(v){VM=v;TAB='tx';UI.tf='all';UI.tc='all';render();window.scrollTo(0,0);};
var PY=0;
function pickBody(){
  var cur=ym(new Date()),h='<div class="monthnav"><button type="button" class="icon" data-a="pickY" data-v="-1" aria-label="-1">‹</button><strong>'+PY+'</strong><button type="button" class="icon" data-a="pickY" data-v="1" aria-label="+1">›</button></div><div class="mgrid">';
  for(var m=1;m<=12;m++){var k=PY+'-'+pad(m),nm=new Intl.DateTimeFormat(loc(),{month:'short'}).format(new Date(PY,m-1,1));
    h+='<button type="button" class="chip'+(k===VM?' on':'')+(k===cur?' now':'')+'" data-a="pickGo" data-v="'+k+'">'+esc(nm)+'</button>';}
  return h+'</div>';
}
ACT.pickM=function(){PY=+VM.slice(0,4);openSheet(t('pickM'),pickBody);};
ACT.pickY=function(v){PY+=+v;redrawSheet();};
ACT.pickGo=function(v){VM=v;UI.sel=null;closeSheet();render();};
ACT.goNow=function(){VM=ym(new Date());render();};
ACT.prev=function(){var p=VM.split('-');VM=ym(new Date(+p[0],+p[1]-2,1));render();};
ACT.next=function(){var p=VM.split('-');VM=ym(new Date(+p[0],+p[1],1));render();};
ACT.disp=function(v){S.disp=v;save();render();};
ACT.lang=function(v){S.lang=v;if(needGate()||!S.objDone)S.disp=(v==='en'?'USD':'EUR');nfCache={};save();render();};
ACT.per=function(v){UI.per=v;render();};
ACT.cm=function(v){UI.cm=v;render();};
ACT.cs=function(v){UI.cs=v;render();};
ACT.calMonth=function(v){VM=v;UI.cs='m';UI.sel=null;render();window.scrollTo(0,0);};
ACT.yprev=function(){var p=VM.split('-');VM=ym(new Date(+p[0]-1,+p[1]-1,1));render();};
ACT.ynext=function(){var p=VM.split('-');VM=ym(new Date(+p[0]+1,+p[1]-1,1));render();};
ACT.tf=function(v){UI.tf=v;render();};
ACT.tc=function(v){UI.tc=v;render();};
ACT.sv=function(v){UI.sv=v;render();window.scrollTo(0,0);};
ACT.span=function(v){UI.span=+v||1;render();};
ACT.ruleReset=function(){applyRule({n:50,w:30,s:20});save();render();};
ACT.selDay=function(v){UI.sel=v;render();};
ACT.closeSheet=function(){closeSheet();};
ACT.sf=function(v){var i=v.indexOf(':'),f=v.slice(0,i);F[f]=v.slice(i+1);if(f==='gtype'&&!F.id)F.emoji=GTYPES[F[f]]||'🎯';if(f==='cat'||f==='mode'||f==='rtype')F.post='';redrawSheet();};
ACT.st=function(v){F[v]=!F[v];if(v==='rec')F.recTouched=true;redrawSheet();};

ACT.addTx=function(){
  var a1=S.accounts.length?S.accounts[0].id:'',a2=S.accounts.length>1?S.accounts[1].id:'';
  F={mode:'exp',post:'',amt:'',cur:UI.lastCur,cat:'needs',sub:'mobile',fee:'',note:'',date:ymd(new Date()),acc:a1,to:a2,trip:false,pay:'card',pending:false,rec:false,id:null,recId:null};
  openSheet(t('addTx'),txForm);
};
ACT.editTx=function(v){
  var x=S.tx.filter(function(y){return y.id===v;})[0];if(!x)return;
  F={mode:x.type,post:x.post||'',amt:numStr(x.amt),cur:x.cur,cat:x.cat||'needs',sub:x.sub||'mobile',fee:x.fee?numStr(fromEur(x.fee,x.cur)):'',note:x.note,date:x.date,acc:x.acc,to:x.to||'',trip:!!x.trip,pay:x.pay||'card',pending:x.status==='pending',id:x.id,recId:x.recId};
  openSheet(t('editTx'),txForm);
};
ACT.saveTx=function(){
  ensureAcc();var a=num(F.amt);if(a<=0){toast(t('errAmt'),true);return;}
  if(F.mode==='tr'&&(!F.acc||!F.to||F.acc===F.to)){toast(t('errTr'),true);return;}
  var tr=activeTrip(),useTrip=F.mode==='exp'&&F.trip&&tr,fam=F.mode==='exp'&&F.cat==='family';
  var old=F.id?S.tx.filter(function(y){return y.id===F.id;})[0]:null;
  if(F.monthOnly&&/^\d{4}-\d{2}$/.test(F.dateM||''))F.date=F.dateM+'-01';
  var x={id:F.id||uid(),type:F.mode,date:F.date||ymd(new Date()),amt:a,cur:F.cur,eur:toEur(a,F.cur),cat:F.mode==='exp'?F.cat:'',sub:fam?F.sub:'',note:F.note.trim(),fee:fam?toEur(num(F.fee),F.cur):0,acc:F.acc||'',to:F.mode==='tr'?F.to:'',trip:useTrip?tr.id:(old&&old.trip&&F.mode==='exp'&&F.trip?old.trip:null),pay:useTrip?F.pay:'',status:F.pending?'pending':'done',recId:F.recId||null,post:postOk(F.mode,F.mode==='exp'?F.cat:'',F.post)};
  if(!old&&F.rec&&F.mode!=='tr'){
    var rid=uid(),dd=+String(x.date).slice(8,10)||1,rm=String(x.date).slice(0,7);
    S.rec.push({id:rid,type:x.type,name:x.note||(x.type==='inc'?t('m_inc'):t('c_'+x.cat)),amt:a,cur:F.cur,day:dd,from:rm,to:'',cat:x.cat,sub:x.sub,acc:x.acc,post:x.post});
    x.recId=rid;
  }
  if(old)S.tx[S.tx.indexOf(old)]=x;else S.tx.push(x);
  UI.lastCur=F.cur;if(/^\d{4}-\d{2}/.test(x.date))VM=x.date.slice(0,7);save();closeSheet();render();toast(t('saved'));
};
ACT.delTx=function(){S.tx=S.tx.filter(function(x){return x.id!==F.id;});save();closeSheet();render();};
function recView(){
  var r=S.rec.filter(function(x){return x.id===F.vr;})[0];if(!r)return '';
  var a=acc(r.acc);
  return '<div class="card flat"><p style="margin:0"><strong>'+esc(r.name)+'</strong></p><p class="big" style="font-size:1.5rem;margin:4px 0">'+(r.type==='inc'?'+':'−')+esc(fmt(r.amt,r.cur))+'</p><p class="small muted" style="margin:0">'+esc(dfmt(F.vd))+(a?' · '+esc(a.name):'')+(r.cat?' · '+esc(t('c_'+r.cat)):'')+(r.post?' · '+esc(t('po_'+r.post)):'')+'</p></div>'+
    '<p class="small muted">'+esc(t('recViewHelp'))+'</p>'+
    '<div class="btns" style="grid-template-columns:1fr"><button type="button" class="btn" data-a="valRecGo">'+esc(t('recDone'))+'</button><button type="button" class="btn ghost" data-a="editRec" data-v="'+esc(r.id)+'">'+esc(t('recEdit'))+'</button><button type="button" class="btn ghost" data-a="closeSheet">'+esc(t('close'))+'</button></div>';
}
ACT.valRec=function(v){
  var p=v.split('|'),r=S.rec.filter(function(x){return x.id===p[0];})[0];if(!r)return;
  F={vr:r.id,vd:p[1]};openSheet(r.name,recView);
};
ACT.valRecGo=function(){
  if(!F||!F.vr)return;var r=S.rec.filter(function(x){return x.id===F.vr;})[0],d=F.vd;if(!r)return;
  closeSheet();
  S.tx.push(mkTx(d,r.type,r.amt,r.cur,r.cat,r.name,r.acc,{sub:r.sub||'',recId:r.id,post:r.post||''}));save();render();toast(t('validated'));
};
ACT.addAcc=function(){F={id:null,name:'',type:'bank',cur:'EUR',open:''};openSheet(t('addAcc'),accForm);};
ACT.editAcc=function(v){var a=acc(v);if(!a)return;F={id:a.id,name:a.name,type:a.type,cur:a.cur,open:numStr(Math.abs(a.open))};openSheet(t('editAcc'),accForm);};
ACT.saveAcc=function(){
  var name=F.name.trim();if(!name){toast(t('errName'),true);return;}
  var o=num(F.open);if(F.type==='loan')o=-Math.abs(o);
  if(F.id){var a=acc(F.id);a.name=name;a.type=F.type;a.cur=F.cur;a.open=o;}
  else S.accounts.push({id:uid(),name:name,type:F.type,cur:F.cur,open:o,since:ymd(new Date())});
  save();closeSheet();render();toast(t('saved'));
};
ACT.delAcc=function(){F.delStep=1;redrawSheet();};
ACT.delAccNo=function(){F.delStep=0;redrawSheet();};
ACT.delAccDo=function(v){
  var id=F.id||F.accId;if(!id)return;
  if(v==='all')S.tx=S.tx.filter(function(x){return x.acc!==id;});
  S.accounts=S.accounts.filter(function(a){return a.id!==id;});
  S.tx.forEach(function(x){if(x.acc===id)x.acc='';if(x.to===id)x.to='';});S.rec.forEach(function(r){if(r.acc===id)r.acc='';});
  save();closeSheet();render();toast(t('delAccDone'));
};
ACT.accOpen=function(v){F={accId:v,real:'',diff:null,dcat:'needs'};openSheet((acc(v)||{}).name||'',accDetail);};
ACT.recCalc=function(){var a=acc(F.accId);if(!a||!String(F.real).trim()){toast(t('errBal'),true);return;}F.diff=num(F.real)-accBal(a);redrawSheet();};
ACT.addDiff=function(){
  var a=acc(F.accId),df=F.diff;if(!a||df===null||Math.abs(df)<0.005)return;
  S.tx.push(mkTx(ymd(new Date()),df<0?'exp':'inc',Math.abs(df),a.cur,df<0?F.dcat:'',t('unexplNote'),a.id));save();closeSheet();render();toast(t('unexplAdded'));
};
ACT.addGoal=function(){F={id:null,gtype:'travel',name:'',emoji:'✈️',target:'',cur:'EUR',years:'',gdate:'',current:'',monthly:'',rate:'',infl:''};openSheet(t('addGoal'),goalForm);};
ACT.editGoal=function(v){var g=S.goals.filter(function(x){return x.id===v;})[0];if(!g)return;F={id:g.id,gtype:g.gtype||'other',gdate:g.date||'',name:g.name,emoji:g.emoji,target:numStr(g.target),cur:g.cur,years:g.years?numStr(g.years,1):'',current:numStr(g.current),monthly:numStr(g.monthly),rate:numStr(g.rate),infl:numStr(g.infl)};openSheet(t('editGoal'),goalForm);};
ACT.saveGoal=function(){
  var name=F.name.trim(),tg=num(F.target);if(!name||tg<=0){toast(t('errGoal'),true);return;}
  var og=F.id?S.goals.filter(function(x){return x.id===F.id;})[0]:null;
  var st0=og&&og.start?og.start:ymd(new Date()),yrs=num(F.years);
  if(/^\d{4}-\d{2}$/.test(F.gdate||'')){var mm=monthsBetween(st0.slice(0,7),F.gdate);if(mm<1){toast(t('errGDate'),true);return;}yrs=mm/12;}
  else if(NEEDDATE.indexOf(F.gtype)>=0){toast(t('errGDateReq'),true);return;}
  var g={id:F.id||uid(),gtype:F.gtype,date:/^\d{4}-\d{2}$/.test(F.gdate||'')?F.gdate:'',name:name,emoji:F.emoji||'🎯',target:tg,cur:F.cur,years:yrs,start:st0,base:og&&og.base!==undefined?og.base:num(F.current),current:num(F.current),monthly:num(F.monthly),rate:num(F.rate),infl:num(F.infl)};
  var i=S.goals.map(function(x){return x.id;}).indexOf(g.id);if(i>=0)S.goals[i]=g;else S.goals.push(g);
  save();closeSheet();render();toast(t('saved'));
};
ACT.delGoal=function(){S.goals=S.goals.filter(function(x){return x.id!==F.id;});save();closeSheet();render();};
ACT.goalAdd=function(v){F={gid:v,amt:''};openSheet(t('deposit'),depForm);};
ACT.saveDep=function(){var a=num(F.amt);if(a<=0){toast(t('errAmt'),true);return;}S.goals.forEach(function(g){if(g.id===F.gid)g.current+=a;});save();closeSheet();render();toast(t('saved'));};
ACT.addRec=function(){F={id:null,rtype:'exp',post:'',name:'',amt:'',cur:'EUR',day:'1',from:VM,to:'',cat:'needs',sub:'mobile',acc:S.accounts.length?S.accounts[0].id:''};openSheet(t('addRec'),recForm);};
ACT.editRec=function(v){var r=S.rec.filter(function(x){return x.id===v;})[0];if(!r)return;F={id:r.id,rtype:r.type,post:r.post||'',name:r.name,amt:numStr(r.amt),cur:r.cur,day:String(r.day),from:r.from||'',to:r.to||'',cat:r.cat||'needs',sub:r.sub||'mobile',acc:r.acc};openSheet(t('editRec'),recForm);};
ACT.saveRec=function(){
  ensureAcc();var name=F.name.trim(),a=num(F.amt),dd=Math.round(num(F.day));if(!name||a<=0||dd<1||dd>31){toast(t('errRec'),true);return;}
  var r={id:F.id||uid(),type:F.rtype,name:name,amt:a,cur:F.cur,day:dd,from:/^\d{4}-\d{2}$/.test(F.from||'')?F.from:VM,to:/^\d{4}-\d{2}$/.test(F.to||'')?F.to:'',cat:F.rtype==='exp'?F.cat:'',sub:(F.rtype==='exp'&&F.cat==='family')?F.sub:'',acc:F.acc||'',post:postOk(F.rtype,F.rtype==='exp'?F.cat:'',F.post)};
  if(r.to&&r.to<r.from){toast(t('errRecPeriod'),true);return;}
  var i=S.rec.map(function(x){return x.id;}).indexOf(r.id);if(i>=0)S.rec[i]=r;else S.rec.push(r);
  save();closeSheet();render();toast(t('saved'));
};
ACT.delRec=function(){S.rec=S.rec.filter(function(x){return x.id!==F.id;});save();closeSheet();render();};
ACT.editEnv=function(){
  F={saving:fieldVal(mget(VM).saving)};SPEND.forEach(function(k){F[k]=fieldVal(S.env[k]||0);});
  openSheet(t('envelopes'),envForm);
};
ACT.saveEnv=function(){
  mset(VM).saving=toEur(num(F.saving),S.disp);SPEND.forEach(function(k){S.env[k]=toEur(num(F[k]),S.disp);});save();closeSheet();render();toast(t('saved'));
};
ACT.addTrip=function(){F={name:'',cur:'EUR',budget:''};openSheet(t('addTrip'),tripForm);};
ACT.saveTrip=function(){
  var b=num(F.budget);if(!F.name.trim()||b<=0){toast(t('errTrip'),true);return;}
  S.trips.forEach(function(x){x.active=false;});S.trips.push({id:uid(),name:F.name.trim(),cur:F.cur,budget:b,active:true});save();closeSheet();render();
};
ACT.toggleTrip=function(v){var tgt=S.trips.filter(function(y){return y.id===v;})[0];if(!tgt)return;var on=!tgt.active;if(on)S.trips.forEach(function(x){x.active=false;});tgt.active=on;save();render();};
ACT.delTrip=function(v){S.trips=S.trips.filter(function(x){return x.id!==v;});S.tx.forEach(function(x){if(x.trip===v){x.trip=null;x.pay='';}});save();render();};
function rangeForm(){
  var h='<p class="muted small">'+esc(t('rangeHelp'))+'</p>'+inp('s-rmin','rmin',t('minF')+' ('+curSym(S.disp)+')','0','inputmode="decimal"')+inp('s-rmax','rmax',t('maxF')+' ('+curSym(S.disp)+')','0','inputmode="decimal"');
  var mn=num(F.rmin),mx=num(F.rmax);
  if(mx>0)h+='<p class="small muted" style="margin-top:8px">≈ '+esc(fcfa(toEur(mn,S.disp)))+' – '+esc(fcfa(toEur(mx,S.disp)))+'</p>';
  return h+'<p class="small muted">'+esc(t('rangeCarry'))+'</p>'+btnRow('saveRange','');
}
ACT.editRange=function(){var m=mget(VM);F={rmin:m.sendMin?fieldVal(m.sendMin):'',rmax:m.sendMax?fieldVal(m.sendMax):''};openSheet(t('yourRange'),rangeForm);};
ACT.saveRange=function(){
  var mn=num(F.rmin),mx=num(F.rmax);
  if(!(mx>0)||mn<0||mn>mx){toast(t('errRange'),true);return;}
  var m=mset(VM);m.sendMin=toEur(mn,S.disp);m.sendMax=toEur(mx,S.disp);save();closeSheet();render();toast(t('saved'));
};
ACT.addSend=function(){ACT.addTx();F.mode='exp';F.cat='family';F.date=(VM===ym(new Date()))?ymd(new Date()):VM+'-01';redrawSheet();};
ACT.projApply=function(){var sg=suggest(VM);sg.proj.list.forEach(function(x){var g=S.goals.filter(function(y){return y.id===x.g.id;})[0];if(g)g.monthly=(g.monthly||0)+fromEur(x.share,g.cur);});save();render();toast(t('suggProjDone'));};
ACT.useSugg=function(){var sg=suggest(VM),m=mset(VM);m.sendMin=sg.min;m.sendMax=sg.max;m.plan=sendSplit(VM,sg.max);save();render();toast(t('suggApplied'));};
ACT.addItem=function(v){S[v].push({id:uid(),name:'',amt:0,cur:'EUR'});save();render();var els=document.querySelectorAll('[data-l="'+v+'"][data-p="name"]');if(els.length)els[els.length-1].focus();};
ACT.delItem=function(v){var p=v.split(':');S[p[0]]=S[p[0]].filter(function(i){return i.id!==p[1];});save();render();};
ACT.saveRefl=function(){var el=$('r-text');mset(VM).reflection=el?el.value:'';save();toast(t('reflSaved'));};
ACT.csv=function(){
  var rows=['date,type,amount,currency,category,item,account,note'];
  S.tx.slice().sort(function(a,b){return a.date<b.date?-1:1;}).forEach(function(x){var a=acc(x.acc);rows.push([x.date,x.type,x.amt,x.cur,x.cat,x.post||'',a?a.name:'','"'+String(x.note).replace(/"/g,'""')+'"'].join(','));});
  UI.csv=rows.join('\n');render();
};
function copyFrom(id){
  var ta=$(id),txt=ta.value;
  function fb(){ta.focus();ta.select();toast(t('copyFail'),true);}
  try{navigator.clipboard.writeText(txt).then(function(){toast(t('copied'));},fb);}catch(e){fb();}
}
ACT.copyCsv=function(){copyFrom('csv-out');};
ACT.copyBk=function(){copyFrom('bk-out');};
ACT.restoreBk=function(){
  var el=$('bk-in'),msg=$('bk-msg');
  try{var o=JSON.parse(el.value);if(!o||o.v!==2||!Array.isArray(o.tx)||!Array.isArray(o.accounts))throw new Error('bad');S=o;fixShape();save();UI.restoreMsg=t('restoreOk');render();toast(t('restoreOk'));}
  catch(e){UI.restoreMsg=t('restoreBad');if(msg)msg.textContent=t('restoreBad');}
};
function wipe(){var lang=S.lang,disp=S.disp,rates=S.rates;S=blankState(lang,disp,rates);UI.confirmReset=false;UI.csv='';save();render();}
ACT.resetAll=function(){if(!UI.confirmReset){UI.confirmReset=true;render();return;}wipe();};
ACT.clearDemo=function(){wipe();};
ACT.loadDemo=function(){demo();fixShape();save();TAB='home';render();window.scrollTo(0,0);};


ACT.authMode=function(v){AUTH.mode=v;AUTH.msg='';render();};
ACT.forgotGo=function(){
  if(AUTH.busy)return;
  var em=($('g-email').value||'').trim();AUTH.email=em;
  if(!em){AUTH.msg=t('authFill');render();return;}
  AUTH.busy=true;AUTH.msg='…';render();
  var back=encodeURIComponent(location.origin+location.pathname);
  api('/auth/v1/recover?redirect_to='+back,{method:'POST',body:{email:em}}).then(function(){AUTH.busy=false;AUTH.msg=t('forgotSent');render();})
    .catch(function(e){AUTH.busy=false;AUTH.msg=(e&&e.status===429)?t('forgotWait'):(e&&e.status===undefined?t('authNet'):t('forgotSent'));render();});
};
ACT.resetGo=function(){
  if(AUTH.busy||!AUTH.recovery)return;
  var pw=$('g-pass').value||'';
  if(pw.length<8){AUTH.msg=t('authWeak');render();return;}
  AUTH.busy=true;AUTH.msg='…';render();
  api('/auth/v1/user',{method:'PUT',body:{password:pw}},AUTH.recovery.access).then(function(j){
    setSession({access_token:AUTH.recovery.access,refresh_token:AUTH.recovery.refresh,expires_in:AUTH.recovery.exp,user:j});
    AUTH.recovery=null;AUTH.guest=false;AUTH.mode='in';
    return pull().then(function(){AUTH.busy=false;AUTH.msg='';TAB='home';render();toast(t('newPassDone'));});
  }).catch(function(e){AUTH.busy=false;AUTH.msg=authMsg(e);render();});
};
ACT.lpAuth=function(v){AUTH.mode=v;AUTH.msg='';render();var el=document.getElementById('g-card');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'});};
ACT.guest=function(){AUTH.guest=true;try{localStorage.setItem('moneyreset.guest','1');}catch(e){}render();};
ACT.goAuth=function(){AUTH.guest=false;try{localStorage.removeItem('moneyreset.guest');}catch(e){}AUTH.msg='';render();};
ACT.authGo=function(){
  if(AUTH.busy)return;
  var em=($('g-email').value||'').trim(),pw=$('g-pass').value||'';
  if(!em||!pw){AUTH.msg=t('authFill');render();return;}
  if(AUTH.mode==='up'&&!AUTH.consent){AUTH.msg=t('consentNeed');render();$('g-email').value=em;$('g-pass').value=pw;return;}
  AUTH.busy=true;AUTH.msg='…';render();
  var up=AUTH.mode==='up';
  var p=up?api('/auth/v1/signup',{method:'POST',body:{email:em,password:pw}}):api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:em,password:pw}});
  p.then(function(j){
    if(!j||!j.access_token){AUTH.busy=false;AUTH.msg=t('authCheck');AUTH.mode='in';render();return;}
    setSession(j);AUTH.guest=false;try{localStorage.removeItem('moneyreset.guest');}catch(e){}
    return pull().then(function(){AUTH.busy=false;AUTH.msg='';TAB='home';render();});
  }).catch(function(e){AUTH.busy=false;AUTH.msg=authMsg(e);render();});
};
function privBody(){
  var P=function(k){return '<h3 style="margin:14px 0 4px;font-size:1rem">'+esc(t('pv_'+k+'_t'))+'</h3><p class="small" style="margin:0">'+esc(t('pv_'+k))+'</p>';};
  return '<p class="small muted" style="margin-top:0">'+esc(t('pvIntro'))+'</p>'+['what','where','who','imp','sec','third','rights','keep'].map(P).join('')+(CFG.contact?'<h3 style="margin:14px 0 4px;font-size:1rem">'+esc(t('pvContactT'))+'</h3><p class="small" style="margin:0">'+esc(CFG.contact)+'</p>':'')+'<p class="small muted" style="margin-top:14px">'+esc(t('pvDate'))+'</p>';
}
ACT.privacy=function(){openSheet(t('privTitle'),privBody);};
function legalBody(){
  var L=function(k,v){return v?'<h3 style="margin:14px 0 4px;font-size:1rem">'+esc(t(k))+'</h3><p class="small" style="margin:0">'+esc(v)+'</p>':'';};
  return L('legalPub',[CFG.publisher,CFG.status].filter(Boolean).join(' · '))+L('legalSiret',CFG.siret)+L('legalAddr',CFG.address)+L('legalContact',CFG.contact)+L('legalHost',t('legalHostTxt'));
}
ACT.legal=function(){openSheet(t('legalTitle'),legalBody);};
ACT.consent=function(){AUTH.consent=!AUTH.consent;AUTH.msg='';var em=($('g-email')||{}).value,pw=($('g-pass')||{}).value;render();if($('g-email'))$('g-email').value=em||'';if($('g-pass'))$('g-pass').value=pw||'';};
ACT.delUser=function(){UI.confirmDelUser=true;render();};
ACT.delUserNo=function(){UI.confirmDelUser=false;render();};
ACT.delUserDo=function(){
  if(!AUTH.session)return;UI.delBusy=true;UI.delMsg='';render();
  token().then(function(tk){return api('/rest/v1/rpc/delete_my_account',{method:'POST',body:{}},tk);}).then(function(){
    clearTimeout(AUTH.timer);AUTH.session=null;authSave();try{localStorage.removeItem(KEY);}catch(e){}
    var lang=S.lang,disp=S.disp,rates=S.rates;S=blankState(lang,disp,rates);AUTH.sync='';AUTH.guest=false;try{localStorage.removeItem('moneyreset.guest');}catch(e){}
    UI.confirmDelUser=false;UI.delBusy=false;AUTH.msg=t('delUserDone');TAB='home';render();
  }).catch(function(){UI.delBusy=false;UI.delMsg=t('delUserErr');render();});
};
ACT.logout=function(){
  clearTimeout(AUTH.timer);var go=function(){AUTH.session=null;authSave();try{localStorage.removeItem(KEY);}catch(e){}var lang=S.lang,disp=S.disp,rates=S.rates;S=blankState(lang,disp,rates);AUTH.sync='';TAB='home';render();};
  if(AUTH.sync==='saving'){token().then(function(tk){return api('/rest/v1/mr_data?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:AUTH.session.uid,data:S,updated_at:new Date().toISOString()}},tk);}).then(go,go);}else go();
};
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&(e.target.id==='g-email'||e.target.id==='g-pass'))ACT.authGo();});

/* ---------- import: CSV / PDF / invoice ---------- */
function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
var RULES=[
  ['family',/sendwave|send wave|lemfi|lem fi|worldremit|world remit|western ?union|moneygram|money gram|remitly|orange ?money|\bwave\b|taptap|tap tap send|ria money|\bwise\b|small ?world|paysend|joni ?joni|\bwari\b|xoom|azimo|remitbee|nala money|afriex|transfert international|international transfer|dakar|senegal|\bsn\b/,'mobile'],
  ['invest',/trade ?republic|degiro|bitstack|binance|coinbase|\betf\b|\bpea\b|assurance[ -]?vie|bourse|crypto|yomoni|linxea|\bscpi\b/],
  ['save',/livret|livjeun|epargne|savings|\bpel\b|\bldds\b|\blep\b/],
  ['needs',/loyer|\brent\b|\bedf\b|engie|totalenergies|enedis|veolia|\borange\b|\bsfr\b|bouygues|\bfree\b|assurance|maif|macif|\baxa\b|navigo|ratp|sncf|\buber\b|\bbolt\b|carrefour|leclerc|auchan|lidl|\baldi\b|monoprix|franprix|intermarche|picard|pharmacie|mutuelle|impot|dgfip|cpam|essence|carburant|parking|sanef|vinci|credit immobilier|electricite|\bgaz\b|internet|doctolib|medecin|ecole|creche|cantine|groceries|supermarket|council tax|electric|insurance|tesco|sainsbury|walmart|kroger|station (total|service|essence)|total access|\besso\b|\bshell\b/],
  ['wants',/restaurant|resto|mcdo|mcdonald|burger|\bkfc\b|ubereats|uber eats|deliveroo|just ?eat|cinema|netflix|spotify|disney|prime video|canal\+?|zara|h&m|kiabi|shein|primark|\bbar\b|cafe|starbucks|booking|airbnb|decathlon|cdiscount|amazon|aliexpress|coiffeur|barber|boulangerie|paypal|marrakech|kebab|sushi|pizza|tacos|snack|brasserie|friterie/],
  ['culture',/librairie|libraire|udemy|coursera|formation|musee|theatre|concert|ticketmaster|billetterie|bookstore|museum|scolaire|scolarite|inscription|universite|tuition|school fees/],
  ['extra',/amende|reparation|garage|depannage|urgence|frais bancaire|agios|commission|overdraft|repair/]
];
var INC_RE=/salaire|\bpaie\b|virement recu|vir recu|pole emploi|france travail|allocation|remboursement|\bprime\b|payroll|salary|refund|deposit/;
function keyOf(label){
  var n=norm(label).replace(/\b(cb|carte|paiement|achat|prlv|prelevement|vir|virement|sepa|retrait|dab|facture|fact|ref|no)\b/g,' ').replace(/\d+/g,' ').replace(/[^a-z ]/g,' ');
  var w=n.split(/\s+/).filter(function(x){return x.length>=3;});
  return w.slice(0,2).join(' ');
}
var WD_RE=/retrait|\bdab\b|\batm\b|cash withdrawal|withdrawal|distributeur|especes/;
var POSTRULES=[
 ['alimony',/pension alimentaire/],['taxProp',/taxe fonciere|foncier/],['taxHab',/taxe d.?habitation|taxe habitation/],['cfe',/\bcfe\b/],
 ['taxIncome',/impots?\b|dgfip|impots\.gouv|prelevement a la source/],
 ['carIns',/assurance (auto|voiture|moto)|direct assurance|\bhiway\b|leocare/],
 ['homeIns',/assurance (habitation|maison|mrh|logement)|maif|macif|matmut|\bgmf\b|groupama|luko|lemonade|axa/],
 ['mutual',/mutuelle|prevoyance|harmonie|\balan\b|malakoff|swisslife sante/],
 ['lifeIns',/assurance[ -]?vie/],['pea',/\bpea\b/],['per',/\bper\b|plan epargne retraite/],['rentalInv',/\bscpi\b|investissement locatif/],
 ['livretJ',/livret jeune|livjeun/],['livretA',/livret a\b/],['ldd',/\bldds?\b/],['livretEp',/\blep\b|livret|epargne/],['emergency',/fonds d.?urgence/],
 ['rent',/loyer|\brent\b|credit immobilier|remboursement (pret|credit)|echeance pret/],
 ['charges',/syndic|copropriete|charges (locatives|copro)|foncia|nexity|charges/],
 ['energy',/\bedf\b|engie|totalenergies|enedis|veolia|suez|\bsaur\b|\beau\b|\bgaz\b|electricite|ilek|ohm energie|mint energie/],
 ['transit',/navigo|ile.de.france mobilites|mobilites|ratp|transilien/],
 ['mobile',/free mobile|sosh|red by|b&you|lebara|lycamobile|forfait|telephone|mobile/],
 ['internet',/internet|fibre|livebox|freebox|\bbox\b|\bfree\b/],['mobile',/orange|\bsfr\b|bouygues/],
 ['car',/credit auto|leasing|\bald\b|remboursement (vehicule|voiture)/],
 ['carMaint',/garage|vidange|controle technique|norauto|midas|feu vert|speedy|euromaster/],
 ['fuel',/essence|carburant|total ?access|\besso\b|\bshell\b|station|peage|sanef|autoroute|vinci/],
 ['transit',/navigo|ratp|sncf|transilien|\bbolt\b|\buber\b|taxi|\btcl\b|tisseo|flixbus|metro|train/],
 ['canteen',/cantine|restauration scolaire/],
 ['school',/scolarite|ecole|college|lycee|universite|inscription|ecolage|tuition|school fees/],
 ['supplies',/fourniture|papeterie|rentree scolaire/],
 ['childcare',/creche|nounou|assistante maternelle|garde d.?enfant|pajemploi|garderie/],
 ['parcel',/colissimo|chronopost|la poste|mondial relay|\bdhl\b|\bups\b|fedex/],
 ['bankFees',/frais bancaire|cotisation carte|agios|commission d.?intervention|frais de tenue/],
 ['pharmacy',/pharmacie|parapharm/],
 ['doctor',/medecin|doctolib|dentiste|\bkine|ophtalmo|radiolog|laboratoire|analyses|hopital|clinique|osteo|psycholog|dermato|cabinet medical|infirm/],
 ['barber',/coiffeur|coiffure|barber|esthetique|manucure|institut de beaute|onglerie|salon de/],
 ['lawyer',/avocat|huissier|notaire/],
 ['groceries',/carrefour|leclerc|auchan|lidl|\baldi\b|monoprix|franprix|intermarche|picard|casino|super u|cora\b|supermarche|biocoop|naturalia|tesco|sainsbury|walmart|kroger|courses/],
 ['market',/marche|caviste|boucherie|primeur|fromager|poissonn/],
 ['restaurants',/restaurant|resto|mcdo|mcdonald|burger|\bkfc\b|ubereats|uber eats|deliveroo|just ?eat|brasserie|kebab|sushi|pizza|tacos|snack|starbucks|\bcafe\b|friterie|boulangerie/],
 ['outings',/cinema|theatre|concert|ticketmaster|billetterie|musee|bowling|parc d.?attraction|\bbar\b/],
 ['travel',/booking|airbnb|air france|ryanair|easyjet|transavia|hotel|vacances|expedia/],
 ['gifts',/cadeau|jouet|king jouet|smyths|zakat|sadaqa|\bdon\b|fondation/],
 ['cleaner',/femme de menage|aide a domicile|cesu/],['tobacco',/tabac|cigarette|vape/],
 ['dryclean',/pressing|teinturerie/],['gym',/salle de sport|basic fit|fitness|\bgym\b|neoness|gymlib|piscine/],
 ['media',/netflix|spotify|disney|prime video|canal\+?|deezer|youtube|itunes|apple\.com|crunchyroll|paramount|playstation|steam/],
 ['petFood',/croquettes|animalerie|zooplus|maxi zoo/],['vet',/veterinaire/],
 ['hobbies',/bricolage|castorama|brico|cultura|jardinerie|truffaut|librairie|micromania/],
 ['shopping',/zara|h&m|kiabi|shein|primark|amazon|aliexpress|cdiscount|vinted|zalando|temu|nike|adidas|decathlon|ikea/]
];
function postCat(p){var r='';Object.keys(POSTG).forEach(function(c){POSTG[c].forEach(function(g){if(g[1].indexOf(p)>=0)r=c;});});return r;}
function postGuess(n){
  for(var i=0;i<POSTRULES.length;i++){if(POSTRULES[i][1].test(n)){var c=postCat(POSTRULES[i][0]);if(c)return {post:POSTRULES[i][0],cat:c};}}
  return null;
}
function guessRow(label,sign,extra){
  var g=guessRow0(label,sign,extra),n=norm(label+' '+(extra||'')),k=keyOf(label),LP=S.learnPost||{};
  if(g.cat==='inc'){
    if(/salaire|\bpaie\b|payroll|salary|net a payer/.test(n))g.post='sal1';
    else if(/prestation|freelance|facture|honoraires|mission|client|auto.?entrepreneur|\burssaf\b/.test(n))g.post='otherInc';
    else if(/loyer recu|revenu foncier|locataire/.test(n))g.post='rentInc';
    else if(/dividende|interets|coupon/.test(n))g.post='capital';
    return g;
  }
  if(g.cat==='family'||g.cat==='withdraw')return g;
  var pg=(k&&LP[k]&&postCat(LP[k])===g.cat)?{post:LP[k],cat:g.cat}:postGuess(n);
  if(pg){
    if(g.cat==='needs'||g.cat==='wants'||g.cat==='culture'||g.cat==='extra'||!g.known){if(pg.cat!=='save'&&pg.cat!=='invest')g.cat=pg.cat;}
    if(g.cat===pg.cat){g.post=pg.post;g.known=true;}
  }
  return g;
}
function guessRow0(label,sign,extra){
  var n=norm(label+' '+(extra||'')),k=keyOf(label),L=S.learn||{};
  if(sign<=0&&WD_RE.test(n))return {cat:'withdraw',sub:'',known:true};
  if(k&&L[k])return {cat:L[k],sub:L[k]==='family'?'mobile':'',known:true,remit:L[k]==='family'};
  if(sign>=0&&INC_RE.test(n))return {cat:'inc',sub:'',known:true};
  for(var i=0;i<RULES.length;i++){if(RULES[i][1].test(n)){var amb=RULES[i][0]==='family'&&/orange ?money/.test(n)&&!/sendwave|send wave|lemfi|lem fi|remitly|worldremit|world remit|western ?union|moneygram|taptap|ria money|small ?world|paysend|joni ?joni/.test(n);return {cat:RULES[i][0],sub:RULES[i][2]||'',known:!amb,remit:RULES[i][0]==='family'};}}
  return sign>0?{cat:'inc',sub:'',known:true}:{cat:'needs',sub:'',known:false};
}
function parseAmt(s){
  var x=String(s==null?'':s).trim();if(!x)return NaN;
  var neg=/^[-−–(]/.test(x)||/-\s*$/.test(x)||/\)\s*$/.test(x)&&/^\(/.test(x);
  x=x.replace(/[^\d.,]/g,'');if(!/\d/.test(x))return NaN;
  var lc=x.lastIndexOf(','),ld=x.lastIndexOf('.');
  if(lc>=0&&ld>=0){if(lc>ld)x=x.replace(/\./g,'').replace(',','.');else x=x.replace(/,/g,'');}
  else if(lc>=0){x=(x.length-lc-1<=2)?x.replace(/,/g,function(m,off){return off===lc?'.':'';}):x.replace(/,/g,'');}
  else if(ld>=0&&(x.match(/\./g)||[]).length>1){x=x.replace(/\./g,function(m,off){return off===ld?'.':'';});}
  var v=parseFloat(x);if(!isFinite(v))return NaN;return neg?-v:v;
}
function parseDate(s,order){
  var m=String(s||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return m[1]+'-'+m[2]+'-'+m[3];
  m=String(s||'').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if(!m)return null;
  var a=+m[1],b=+m[2],y=+m[3],d=order==='mdy'?b:a,mo=order==='mdy'?a:b;
  if(y<100)y+=2000;if(mo<1||mo>12||d<1||d>31)return null;
  return y+'-'+pad(mo)+'-'+pad(d);
}
function dateOrder(strs){
  var mdy=false,dmy=false;
  strs.forEach(function(s){var m=String(s||'').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-]\d{2,4}/);if(!m)return;if(+m[1]>12)dmy=true;if(+m[2]>12)mdy=true;});
  return (mdy&&!dmy)?'mdy':'dmy';
}
function splitCSV(text){
  var first=(text.split(/\r?\n/).filter(function(l){return l.trim();})[0])||'';
  var cnt=function(ch){return first.split(ch).length-1;};
  var d=(cnt(';')>0&&cnt(';')>=cnt(','))?';':(cnt('\t')>cnt(',')?'\t':',');
  var rows=[],row=[],cell='',q=false,i,c;
  var flush=function(){row.push(cell);cell='';if(row.some(function(x){return x.trim();}))rows.push(row);row=[];};
  for(i=0;i<text.length;i++){c=text.charAt(i);
    if(q){if(c==='"'){if(text.charAt(i+1)==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
    else if(c==='"')q=true;
    else if(c===d){row.push(cell);cell='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text.charAt(i+1)==='\n')i++;flush();}
    else cell+=c;}
  if(cell||row.length)flush();
  return rows;
}
function parseCSV(text){
  var R=splitCSV(String(text).replace(/^﻿/,'')),h=-1,i,cols={d:-1,l:-1,a:-1,db:-1,cr:-1};
  for(i=0;i<Math.min(R.length,15);i++){
    var hs=R[i].map(norm);
    var hd=hs.some(function(x){return /^date|date (op|de|val)|booking|posted|transaction date/.test(x);});
    var ha=hs.some(function(x){return /montant|amount|debit|credit|valeur|sortie|entree|withdraw|deposit/.test(x);});
    if(hd&&ha){h=i;break;}
  }
  var allDates=[];
  if(h>=0){
    R[h].map(norm).forEach(function(x,idx){
      if(cols.d<0&&/^date|date (op|de)|booking|posted|transaction date/.test(x))cols.d=idx;
      else if(cols.l<0&&/libelle|label|description|detail|operation|memo|objet|name|nom|beneficiaire|payee|narrative/.test(x))cols.l=idx;
      else if(cols.db<0&&/debit|sortie|withdraw|depense|paid out/.test(x))cols.db=idx;
      else if(cols.cr<0&&/credit|entree|deposit|recette|paid in/.test(x))cols.cr=idx;
      else if(cols.a<0&&/montant|amount|valeur|value/.test(x))cols.a=idx;
    });
  }else{
    var sample=R.slice(0,30),n=R.reduce(function(m,r){return Math.max(m,r.length);},0),best={d:-1,dn:0},j;
    for(j=0;j<n;j++){var dn=sample.filter(function(r){return parseDate(r[j])!==null;}).length;if(dn>best.dn){best.dn=dn;best.d=j;}}
    cols.d=best.d;
    for(j=n-1;j>=0;j--){if(j===cols.d)continue;var an=sample.filter(function(r){return r[j]&&!isNaN(parseAmt(r[j]))&&/\d[.,]\d{1,2}\s*[€$a-z]*\s*$|^\s*[-+−]?\d+\s*$/i.test(r[j]);}).length;if(an>=sample.length/2){cols.a=j;break;}}
    var bl=-1,bn=0;for(j=0;j<n;j++){if(j===cols.d||j===cols.a)continue;var len=sample.reduce(function(s,r){return s+String(r[j]||'').length;},0);if(len>bn){bn=len;bl=j;}}
    cols.l=bl;h=-1;
  }
  if(cols.d<0||(cols.a<0&&cols.db<0&&cols.cr<0))return [];
  for(i=h+1;i<R.length;i++)allDates.push(R[i][cols.d]);
  var order=dateOrder(allDates),out=[];
  for(i=h+1;i<R.length;i++){
    var r=R[i],date=parseDate(r[cols.d],order);if(!date)continue;
    var v;
    if(cols.a>=0)v=parseAmt(r[cols.a]);
    else{var dv=cols.db>=0?parseAmt(r[cols.db]):NaN,cv=cols.cr>=0?parseAmt(r[cols.cr]):NaN;v=!isNaN(cv)&&cv!==0?Math.abs(cv):(!isNaN(dv)&&dv!==0?-Math.abs(dv):NaN);}
    if(isNaN(v)||v===0)continue;
    var label=(cols.l>=0?String(r[cols.l]||''):'').replace(/\s+/g,' ').trim()||t('impNoLabel');
    out.push({date:date,label:label,amt:Math.abs(v),sign:v<0?-1:1});
  }
  return out;
}
var AMT_RE=/[-−+]?\s?\d{1,3}(?:[ .  ]\d{3})*[.,]\d{2}(?!\d)|[-−+]?\d+[.,]\d{2}(?!\d)/g;
var LEAD_DT=/^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}[\/.]\d{1,2})(?=\s|$)/;
function isDateStr(x){
  x=String(x).trim();
  if(/^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})$/.test(x))return true;
  var m=x.match(/^(\d{1,2})[\/.](\d{1,2})$/);return !!m&&+m[1]>=1&&+m[1]<=31&&+m[2]>=1&&+m[2]<=12;
}
function isAmtStr(x){
  x=String(x).trim();
  if(!/^[-−+]?\s?(\d{1,3}([ .  ]\d{3})*|\d+)[.,]\d{2}$/.test(x))return false;
  return x.indexOf(',')>=0||!isDateStr(x);
}
function periodOf(lines){
  for(var i=0;i<lines.length;i++){
    var m=lines[i].t.match(/du\s+(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\s+au\s+(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/i);
    if(m)return {sm:+m[2],sy:+m[3],em:+m[5],ey:+m[6]};
  }
  return null;
}
function fullDate(x,per,order){
  var d=parseDate(x,order);if(d)return d;
  var m=String(x).trim().match(/^(\d{1,2})[\/.](\d{1,2})$/);if(!m)return null;
  var day=+m[1],mo=+m[2];if(mo<1||mo>12||day<1||day>31)return null;
  var y=per?(per.sy===per.ey?per.ey:(mo>per.em?per.sy:per.ey)):new Date().getFullYear();
  return y+'-'+pad(mo)+'-'+pad(day);
}
function hintText(h){
  return h.filter(function(x){return !/^(ref\.|id\.|ref client|mandat|reference)/i.test(x.trim());}).map(function(x){return x.replace(/^LIBELLE:\s*/i,'');}).join(' ').replace(/\s+/g,' ').trim();
}
function parseColumns(lines,per,order){
  var cols=null,cur=null,out=[];
  lines.forEach(function(l){
    if(!l.it||!l.it.length)return;
    var dI=-1,cI=-1;
    l.it.forEach(function(o,i){var w=norm(o.s).replace(/[^a-z]/g,'');if(dI<0&&/^debit/.test(w))dI=i;else if(cI<0&&/^credit/.test(w))cI=i;});
    if(dI>=0&&cI>=0&&l.it.length<=8){cols={d:(l.it[dI].x+l.it[dI].r)/2,c:(l.it[cI].x+l.it[cI].r)/2};cur=null;return;}
    if(!cols)return;
    var first=l.it[0],nt=norm(l.t);
    if(isDateStr(first.s)){
      var isA=function(o){return isAmtStr(o.s)&&o.x>=Math.min(cols.d,cols.c)-80;};
      var amts=l.it.filter(function(o,i){return i>0&&isA(o);});
      var lab=l.it.filter(function(o,i){return i>0&&!isDateStr(o.s)&&!isA(o);}).map(function(o){return o.s;}).join(' ').replace(/\s+/g,' ').trim();
      cur=null;
      if(!amts.length||!lab||/solde|totaux?\b|total des|report/.test(norm(lab)))return;
      var a=amts[0],v=Math.abs(parseAmt(a.s));if(isNaN(v)||v===0)return;
      var mid=(cols.d+cols.c)/2,ctr=(a.x+a.r)/2,credit=cols.c>cols.d?ctr>mid:ctr<mid,date=fullDate(first.s,per,order);
      if(!date)return;
      cur={date:date,lk:lab,label:lab,amt:v,sign:credit?1:-1,unsure:false,hint:[],x0:first.r};
      out.push(cur);
    }else if(cur&&first.x>cur.x0&&first.x<cur.x0+70&&!/^(page|credit lyonnais|suite)/.test(nt)){
      cur.hint.push(l.t);
    }else cur=null;
  });
  out.forEach(function(r){var h=hintText(r.hint);r.gtext=h;if(h)r.label=r.lk+' · '+h.slice(0,60);delete r.hint;delete r.x0;});
  return out;
}
function parseLines(lines){
  lines=lines.map(function(l){return typeof l==='string'?{t:l,it:null}:l;});
  var per=periodOf(lines);
  var order=dateOrder(lines.map(function(l){var m=l.t.match(LEAD_DT);return m?m[1]:'';}));
  var col=parseColumns(lines,per,order);
  if(col.length)return col;
  var out=[],dated=lines.filter(function(l){var m=l.t.match(LEAD_DT);return m&&AMT_RE.test(l.t.slice(m[0].length))&&((AMT_RE.lastIndex=0)===0);});
  if(dated.length>=3){
    dated.forEach(function(l){
      var m=l.t.match(LEAD_DT),date=fullDate(m[1],per,order);if(!date)return;
      var rest=l.t.slice(m[0].length),am=rest.match(AMT_RE);if(!am)return;
      var label=rest.slice(0,rest.indexOf(am[0])).replace(/^\s*\d{1,2}[\/.]\d{1,2}([\/.]\d{2,4})?\s+/,'').replace(/\s+/g,' ').trim();
      var tok=am[0].replace(/\s/g,''),v=parseAmt(tok);if(isNaN(v)||v===0||!label)return;
      out.push({date:date,lk:label,label:label,amt:Math.abs(v),sign:/^[-−]/.test(tok)?-1:(/^\+/.test(tok)?1:0),unsure:true});
    });
    return out;
  }
  var tx=lines.map(function(l){return l.t;});
  var pick=function(re){var best=null;tx.forEach(function(l){if(!re.test(norm(l)))return;(l.match(AMT_RE)||[]).forEach(function(x){var v=Math.abs(parseAmt(x));if(v>0&&(best===null||v>best))best=v;});});return best;};
  var total=pick(/ttc|a payer|amount due|balance due|total due/);if(total===null)total=pick(/total/);
  if(total===null){tx.forEach(function(l){(l.match(AMT_RE)||[]).forEach(function(x){var v=Math.abs(parseAmt(x));if(v>0&&(total===null||v>total))total=v;});});}
  if(total===null)return [];
  var dl=null;tx.forEach(function(l){if(dl)return;var m=l.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/);if(m&&/date|emis|facture du|invoice|issued/.test(norm(l)))dl=m[0];});
  if(!dl){tx.forEach(function(l){if(dl)return;var m=l.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/);if(m)dl=m[0];});}
  var date=(dl&&parseDate(dl,order))||ymd(new Date()),vendor='';
  tx.forEach(function(l){if(vendor)return;var c=l.trim();if(c.replace(/[^A-Za-zÀ-ÿ]/g,'').length>=3&&!/facture|invoice|date|page|^n[°o]/i.test(c))vendor=c.slice(0,40);});
  var lb=(vendor||t('impInvoice'))+' · '+t('impInvoice');
  out.push({date:date,lk:vendor||lb,label:lb,amt:total,sign:-1,unsure:true,inv:true});
  return out;
}
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  return new Promise(function(ok,ko){
    var s=document.createElement('script');s.src='vendor/pdf.min.js';
    s.onload=function(){try{window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';ok(window.pdfjsLib);}catch(e){ko(e);}};
    s.onerror=function(){ko(new Error('pdfjs'));};document.head.appendChild(s);
  });
}
function toLines(contents){
  var lines=[];
  contents.forEach(function(tc){
    var rows={};
    tc.items.forEach(function(it){
      if(!it.str||!it.str.trim())return;
      var y=Math.round(it.transform[5]/3);
      (rows[y]=rows[y]||[]).push({x:it.transform[4],r:it.transform[4]+(it.width||0),s:it.str.trim()});
    });
    Object.keys(rows).map(Number).sort(function(a,b){return b-a;}).forEach(function(y){
      var it=rows[y].sort(function(a,b){return a.x-b.x;});
      lines.push({t:it.map(function(o){return o.s;}).join(' ').replace(/\s+/g,' ').trim(),it:it});
    });
  });
  return lines;
}
function pdfLines(buf){
  return loadPdfJs().then(function(lib){return lib.getDocument({data:buf,isEvalSupported:false}).promise;}).then(function(doc){
    var pages=[],p;for(p=1;p<=Math.min(doc.numPages,30);p++)pages.push(doc.getPage(p).then(function(pg){return pg.getTextContent();}));
    return Promise.all(pages);
  }).then(toLines);
}
function findBalance(lines){
  var best=null;
  lines.forEach(function(l){
    var n=norm(l.t);if(!/(nouveau solde|solde final|solde en fin|solde au|solde fin|closing balance|ending balance|balance at|balance as of)/.test(n)||/ancien|ouverture|opening|previous|precedent|debut|beginning/.test(n))return;
    var am=l.t.match(AMT_RE);if(!am)return;var tok=am[am.length-1].replace(/\s/g,''),v=parseAmt(tok);if(isNaN(v))return;
    if(/debiteur|debit(?!e)/.test(n)&&v>0)v=-v;
    var dm=l.t.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
    best={amt:v,date:dm?dm[3]+'-'+pad(+dm[2])+'-'+pad(+dm[1]):''};
  });
  return best;
}
var REC_RE=/loyer|\brent\b|abonnement|subscription|netflix|spotify|disney|canal\+?|prime video|\bedf\b|engie|totalenergies|enedis|internet|\bfree\b|\bsfr\b|bouygues|orange(?! ?money)|assurance|mutuelle|navigo|credit|\bpret\b|emprunt|salaire|salary|payroll|basic ?fit|cotisation|impot|dgfip|mensualite|insurance|electric/;
var REC_INV=/versement programme|virement permanent|trade ?republic|bitstack|\bpea\b|assurance[ -]?vie|livret|epargne programmee|\bscpi\b|yomoni|linxea/;
var ESS_RE=/loyer|\brent\b|\bedf\b|engie|totalenergies|enedis|electricite|\bgaz\b|veolia|\beau\b|internet|fibre|livebox|freebox|free mobile|sosh|forfait|orange|\bsfr\b|bouygues|assurance|maif|macif|mutuelle|credit|\bpret\b|impot|dgfip|cantine|creche|syndic|copropriete|navigo/;
var REC_EXPL=/virement permanent|versement programme|prelevement mensuel|abonnement mensuel|echeance|mensualite|cotisation mensuelle|forfait mensuel/;
function histRec(label,amt,date,inc){
  var k=keyOf(label);if(!k||!(amt>0))return false;
  if(S.rec.some(function(x){return keyOf(x.name)===k&&x.type===(inc?'inc':'exp');}))return true;
  var ms={};ms[String(date).slice(0,7)]=1;
  S.tx.forEach(function(x){if(x.type===(inc?'inc':'exp')&&keyOf(x.note)===k&&x.date.slice(0,7)!==String(date).slice(0,7)&&Math.abs(x.amt-amt)/amt<0.2)ms[x.date.slice(0,7)]=1;});
  return Object.keys(ms).length>1;
}
function recGuess(rows){
  var cnt={};
  rows.forEach(function(r){var k=keyOf(r.lk||r.label);if(!k)return;(cnt[k]=cnt[k]||{})[r.date.slice(0,7)]=r.amt;});
  rows.forEach(function(r){
    var k=keyOf(r.lk||r.label),n=norm(r.label),ms=0;if(k&&cnt[k]){var ml=Object.keys(cnt[k]);ms=ml.some(function(m){return m!==r.date.slice(0,7)&&Math.abs(cnt[k][m]-r.amt)/Math.max(r.amt,0.01)<0.15;})?2:1;}
    var hist=!!k&&(S.rec.some(function(x){return keyOf(x.name)===k;})||S.tx.some(function(x){return x.date.slice(0,7)!==r.date.slice(0,7)&&keyOf(x.note)===k&&r.amt>0&&Math.abs(x.amt-r.amt)/r.amt<0.15;}));
    var LR=S.learnRec||{};
    var first=(r.cat==='inc'&&/salaire|\bpaie\b|payroll|salary/.test(n))||(r.cat==='needs'&&ESS_RE.test(n))||(r.cat==='family'&&r.known)||REC_EXPL.test(n);
    var varia=/^(groceries|market|restaurants|fuel|shopping|outings|travel|gifts|pharmacy|doctor|barber|parcel)$/.test(r.post||'');
    r.rec=r.cat==='withdraw'?false:(k&&LR[k]!==undefined?!!LR[k]:!!(first||(!varia&&(ms>1||hist))));
  });
}
function buildRow(r){
  var g=guessRow(r.lk||r.label,r.sign,r.gtext),dup=S.tx.some(function(x){return x.date===r.date&&Math.abs(x.amt-r.amt)<0.005;});
  return {on:!dup,date:r.date,label:r.label,lk:r.lk||r.label,amt:r.amt,cat:g.cat,guess:g.cat,known:g.known,sub:g.sub||'',dup:dup,unsure:!!r.unsure,remit:!!g.remit,inv:!!r.inv,rec:false,post:g.post||'',guessPost:g.post||''};
}
function impFail(key){if(!F)return;F.busy=false;F.step='pick';F.msg=t(key);redrawSheet();}
function impDone(rows,src,bal){
  if(!F)return;
  if(!rows.length){impFail('impNone');return;}
  F.busy=false;F.src=src;F.rows=rows.slice(0,1500).map(buildRow);recGuess(F.rows);F.step='review';F.msg='';
  F.bal=bal||null;F.setBal=!!bal;
  var ka=F.fileKey&&S.learnAcc&&S.learnAcc[F.fileKey];if(ka&&acc(ka)){F.acc=ka;F.autoAcc=true;}
  redrawSheet();
}
function scrub(x){
  var q=String(x||'');
  q=q.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g,'');
  q=q.replace(/\b(?:\d[ -]?){12,19}\b/g,'');
  q=q.replace(/\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b(?=.*\b(?:bic|swift)\b|$)/g,function(m){return /^[A-Z]{6,11}$/.test(m)&&/BIC|SWIFT/i.test(q)?'':m;});
  q=q.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,'');
  q=q.replace(/(?:\+|00)?\d{1,3}[ .-]?(?:\(?\d\)?[ .-]?){8,11}\d\b/g,'');
  q=q.replace(/\b0\d(?:[ .-]?\d{2}){4}\b/g,'');
  q=q.replace(/\b(?:ref|reference|réf|mandat|rum|ics|id|n°|no)\s*[:.]?\s*[A-Z0-9-]{6,}\b/gi,'');
  q=q.replace(/\b(M|MR|MME|MLLE|MONSIEUR|MADAME|Mr|Mme|Mlle|Mrs|Ms|Miss)\.?\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+)((?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+){0,2})/g,function(m,t,a,rest){return t+' '+a+(rest?rest.trim().split(/\s+/).map(function(w){return ' '+w.charAt(0)+'.';}).join(''):'');});
  return q.replace(/\s{2,}/g,' ').replace(/[\s:;,\/-]+$/,'').trim();
}
function scrubRows(rows){return rows.map(function(r){r.label=scrub(r.label)||r.label.replace(/[0-9]/g,'')||'—';if(r.lk)r.lk=scrub(r.lk)||r.label;if(r.gtext)r.gtext=scrub(r.gtext);return r;});}
function readOne(file){
  var name=String(file.name||'').toLowerCase(),type=file.type||'';
  if(/\.pdf$/.test(name)||type==='application/pdf'){
    return file.arrayBuffer().then(pdfLines).then(function(lines){
      if(lines.map(function(l){return l.t;}).join('').replace(/\s/g,'').length<20)return {err:'impScan'};
      return {rows:scrubRows(parseLines(lines)),bal:findBalance(lines),src:'pdf'};
    }).catch(function(){return {err:'impPdfFail'};});
  }
  if(type.indexOf('image/')===0||/\.(png|jpe?g|heic|webp)$/.test(name))return Promise.resolve({err:'impScan'});
  return file.text().then(function(tx){return {rows:scrubRows(parseCSV(tx)),src:'csv'};}).catch(function(){return {err:'impNone'};});
}
function handleFile(files){
  if(!files||!F)return;
  var list=files.length===undefined?[files]:Array.prototype.slice.call(files);if(!list.length)return;
  F.busy=true;F.msg=t('impReading');F.step='pick';redrawSheet();
  var first=String(list[0].name||'').toLowerCase();F.fileKey=first.replace(/\.[a-z0-9]+$/,'').replace(/[0-9]+/g,'').replace(/[^a-z]+/g,' ').trim().slice(0,30);
  Promise.all(list.map(readOne)).then(function(res){
    var ok=res.filter(function(r){return !r.err;});
    if(!ok.length){impFail(res[0].err||'impNone');return;}
    var seen={},rows=[],bal=null,src=ok[0].src;
    ok.forEach(function(r){
      var mine={};
      r.rows.forEach(function(x){var k=x.date+'|'+x.amt+'|'+norm(x.label);if(seen[k])return;mine[k]=(mine[k]||0)+1;rows.push(x);});
      Object.keys(mine).forEach(function(k){seen[k]=1;});
      if(r.bal&&(!bal||(r.bal.date||'')>(bal.date||'')))bal=r.bal;
      if(r.src==='pdf')src='pdf';
    });
    rows.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
    F.nFiles=list.length;F.nBad=res.length-ok.length;
    impDone(rows,src,bal);
  });
}
function menuForm(){
  return '<div class="card" style="padding:4px 16px"><button type="button" class="row" data-a="impOpen"><span class="ico">📄</span><span class="mid"><span class="t">'+esc(t('menuImport'))+'</span><span class="muted small">'+esc(t('menuImportH'))+'</span></span><span class="muted">›</span></button>'+
    '<button type="button" class="row" data-a="addTx"><span class="ico">✍️</span><span class="mid"><span class="t">'+esc(t('menuManual'))+'</span><span class="muted small">'+esc(t('menuManualH'))+'</span></span><span class="muted">›</span></button></div>';
}
function impCoh(){
  var res={near:{},diff:{},missing:[],n:0};if(!F||!F.rows||!F.rows.length)return res;
  var minD='9999-99-99',maxD='',tol=function(a,b){return Math.abs(a-b)<0.005;},dd=function(a,b){return Math.abs((pd(a)-pd(b))/864e5);};
  F.rows.forEach(function(r){if(r.date<minD)minD=r.date;if(r.date>maxD)maxD=r.date;});
  var mine=S.tx.filter(function(x){return x.cur===F.cur&&(x.type==='exp'||x.type==='inc')&&x.date>=minD&&x.date<=maxD&&(!F.acc||F.acc==='__new'||x.acc===F.acc);});
  var used={};
  F.rows.forEach(function(r,i){
    var inc=r.cat==='inc',k=keyOf(r.lk||r.label),best=null,kind='';
    mine.forEach(function(x){
      if(used[x.id]||(x.type==='inc')!==inc)return;var d=dd(x.date,r.date);
      if(tol(x.amt,r.amt)&&d===0){used[x.id]=1;best=null;kind='ok';return;}
      if(kind==='ok')return;
      if(tol(x.amt,r.amt)&&d<=3&&!best){best=x;kind='near';}
      else if(d<=3&&!best&&((k&&keyOf(x.note)===k)||(x.cat&&x.cat===r.cat&&x.amt>0&&Math.abs(x.amt-r.amt)/x.amt<=0.25))){best=x;kind='diff';}
    });
    if(kind==='near'&&best){res.near[i]=best;used[best.id]=1;res.n++;}
    else if(kind==='diff'&&best){res.diff[i]=best;used[best.id]=1;res.n++;}
  });
  res.missing=mine.filter(function(x){return !used[x.id];});
  return res;
}
function impAccField(){
  var inv=F.rows.length===1&&F.rows[0].inv,h='<label class="f" for="s-acc">'+esc(t(inv?'impPaidWith':'account'))+'</label>';
  if(S.accounts.length)h+='<select class="in" id="s-acc" data-s="acc">'+S.accounts.map(function(a){return '<option value="'+a.id+'"'+(a.id===F.acc?' selected':'')+'>'+esc(a.name)+' ('+esc(t('at_'+a.type))+', '+curLabel(a.cur)+')</option>';}).join('')+'<option value="__new"'+(F.acc==='__new'?' selected':'')+'>'+esc(t('accNewOpt'))+'</option></select>';
  if(F.autoAcc&&acc(F.acc))h+='<p class="small pos" style="margin:6px 0 0">'+esc(t('impAccKnown'))+' '+esc(acc(F.acc).name)+'</p>';
  if(F.acc==='__new'||!S.accounts.length)h+='<p class="small muted" style="margin:8px 0 4px">'+esc(t('impAccType'))+'</p><div class="chips">'+ATYPES.map(function(k){return sfchip('atype',k,AEMO[k]+' '+esc(t('at_'+k)));}).join('')+'</div><input class="in" id="s-accNew" data-s="accNew" style="margin-top:8px" value="'+esc(F.accNew||'')+'" placeholder="'+esc(t('accNewPh'))+'">';
  return h;
}
function importForm(){
  if(F.step==='review'){
    var h='<p class="small muted">'+esc(t('impReview'))+'</p>';
    if(F.src==='pdf')h+='<div class="note"><p class="small" style="margin:0">'+esc(t('impUnsure'))+'</p></div>';
    var mc0={};F.rows.forEach(function(r){var k=r.date.slice(0,7);mc0[k]=(mc0[k]||0)+1;});
    var mks=Object.keys(mc0).sort();
    h+='<div class="note"><p class="small" style="margin:0"><strong>'+esc(t('impMonths'))+'</strong>'+(F.nFiles>1?' ('+F.nFiles+' '+esc(t('impFiles'))+(F.nBad?', '+F.nBad+' '+esc(t('impFilesBad')):'')+')':'')+'<br>'+mks.map(function(k){return esc(mlabel(k))+' : '+mc0[k];}).join(' · ')+'</p></div>';
    h+=impAccField()+'<label class="f">'+esc(t('currency'))+'</label><div class="chips">'+CURS.map(function(c){return sfchip('cur',c,curLabel(c));}).join('')+'</div>';
    if(F.bal)h+='<div class="note" style="margin-top:12px"><p class="small" style="margin:0 0 6px"><strong>'+esc(t('impBal'))+' : '+esc(fmt(F.bal.amt,F.cur))+(F.bal.date?' ('+esc(dfmt(F.bal.date))+')':'')+'</strong></p><div class="chips">'+chip('st','setBal',!!F.setBal,esc(t('impSetBal')))+'</div></div>';
    var coh=impCoh(),nNear=Object.keys(coh.near).length,nDiff=Object.keys(coh.diff).length;
    if(nNear||nDiff||coh.missing.length){
      h+='<div class="note" style="margin-top:12px;border-left:4px solid #e07b00"><p class="small" style="margin:0 0 4px"><strong>⚠️ '+esc(t('cohT'))+'</strong></p>'+
        (nDiff?'<p class="small" style="margin:3px 0">• '+nDiff+' '+esc(t('cohDiff'))+'</p>':'')+
        (nNear?'<p class="small" style="margin:3px 0">• '+nNear+' '+esc(t('cohNear'))+'</p>':'')+
        (coh.missing.length?'<p class="small" style="margin:3px 0">• '+coh.missing.length+' '+esc(t('cohMissing'))+'</p><p class="small muted" style="margin:0 0 0 10px">'+coh.missing.slice(0,5).map(function(x){return esc(dfmt(x.date)+' · '+(x.note||t('c_'+x.cat))+' · '+fmt(x.amt,x.cur));}).join('<br>')+'</p>':'')+'</div>';
    }else if(S.tx.length)h+='<p class="small pos" style="margin:10px 0 0">✓ '+esc(t('cohOk'))+'</p>';
    var nsel=F.rows.filter(function(r){return r.on;}).length;
    h+='<h3 style="margin-top:16px">'+esc(F.rows.length+' '+t('impFound'))+'</h3><p class="small muted" style="margin:0 0 8px">'+nsel+' / '+F.rows.length+' '+esc(t('impSelCount'))+'</p>'+
      '<div class="chips sm" style="margin-bottom:10px"><button type="button" class="chip" data-a="impSel" data-v="all">'+esc(t('impAll'))+'</button><button type="button" class="chip" data-a="impSel" data-v="new">'+esc(t('impNew'))+'</button><button type="button" class="chip" data-a="impSel" data-v="none">'+esc(t('impNone'))+'</button></div>';
    function impPost(i,r){
      if(r.cat==='withdraw')return '';
      var inc=r.cat==='inc',L=postList(inc?'inc':'exp',inc?'':r.cat);if(!L.length||r.cat==='family')return '';
      var opt=function(k){return '<option value="'+k+'"'+(r.post===k?' selected':'')+'>'+esc(t('po_'+k))+'</option>';};
      var body=inc?L.map(opt).join(''):(POSTG[r.cat]||[]).map(function(g){return '<optgroup label="'+esc(t(g[0]))+'">'+g[1].map(opt).join('')+'</optgroup>';}).join('');
      return '<select class="in" data-imp="'+i+'" data-k="post" aria-label="'+esc(t(inc?'incSource':'poste'))+'"><option value="">'+esc(t('posteNone'))+'</option>'+body+'</select>';
    }
    h+=F.rows.map(function(r,i){
      var opts='<option value="inc"'+(r.cat==='inc'?' selected':'')+'>'+esc(CEMO.inc+' '+t('m_inc'))+'</option><option value="withdraw"'+(r.cat==='withdraw'?' selected':'')+'>💵 '+esc(t('wdCat'))+'</option>'+CATS.map(function(k){return '<option value="'+k+'"'+(r.cat===k?' selected':'')+'>'+esc(CEMO[k]+' '+t('c_'+k))+'</option>';}).join('');
      return '<div class="irow'+(r.dup?' dup':'')+'"><label class="ichk"><input type="checkbox" data-imp="'+i+'" data-k="on"'+(r.on?' checked':'')+'><span class="t">'+esc(r.label)+'</span></label>'+
        '<span class="amt '+(r.cat==='inc'?'pos':'')+'">'+(r.cat==='inc'?'+':'−')+esc(fmt(r.amt,F.cur))+'</span>'+
        '<span class="muted small">'+esc(dfmt(r.date))+(r.dup?' · '+esc(t('impDup')):'')+(coh.diff[i]?' · <strong style="color:#e07b00">⚠️ '+esc(t('cohTagDiff'))+' '+esc(fmt(coh.diff[i].amt,coh.diff[i].cur))+'</strong>':'')+(coh.near[i]?' · <strong style="color:#e07b00">⚠️ '+esc(t('cohTagNear'))+' '+esc(dfmt(coh.near[i].date))+'</strong>':'')+(!r.known?' · '+esc(t('impCheck')):'')+(r.remit&&r.cat==='family'?' · 🌍 '+esc(t('impRemit')):'')+'</span>'+
        (r.cat==='withdraw'?'<span class="small irec">💵 '+esc(t('wdNote'))+'</span>':'<label class="small irec"><input type="checkbox" data-imp="'+i+'" data-k="rec"'+(r.rec?' checked':'')+'> '+esc(t('impRec'))+'</label>')+
        '<select class="in" data-imp="'+i+'" data-k="cat" aria-label="'+esc(t('category'))+'">'+opts+'</select>'+impPost(i,r)+'</div>';
    }).join('');
    return h+'<div class="btns" style="grid-template-columns:1fr 1fr"><button type="button" class="btn" data-a="impGo">'+esc(t('impGo'))+' ('+nsel+')</button><button type="button" class="btn ghost" data-a="impOpen">'+esc(t('impAgain'))+'</button></div>';
  }
  return '<p class="muted">'+esc(t('impPick'))+'</p><input class="in" type="file" id="imp-file" accept=".csv,.txt,text/csv,.pdf,application/pdf,image/*" multiple'+(F.busy?' disabled':'')+'>'+
    '<p class="small" role="alert" style="min-height:1.2em;margin:10px 0">'+esc(F.msg||'')+'</p>'+
    '<p class="small muted">'+esc(t('impFormats'))+'</p><p class="small muted">'+esc(t('impPrivacy'))+'</p>'+
    '<button type="button" class="btn ghost full" data-a="addTx">'+esc(t('menuManual'))+'</button>';
}
ACT.addMenu=function(){openSheet(t('addMenuT'),menuForm);};
ACT.impSel=function(v){if(!F||!F.rows)return;F.rows.forEach(function(r){r.on=(v==='all')?true:(v==='none'?false:!r.dup);});redrawSheet();};
ACT.impOpen=function(){
  var a=S.accounts[0];
  F={step:'pick',rows:[],acc:a?a.id:'__new',cur:a&&CURS.indexOf(a.cur)>=0?a.cur:S.disp,msg:'',busy:false,src:'',atype:'bank',accNew:'',alloc:'',bal:null,setBal:false,fileKey:'',autoAcc:false};
  openSheet(t('impTitle'),importForm);
};
ACT.impGo=function(){
  var sel=F.rows.filter(function(r){return r.on;});
  if(!sel.length){toast(t('impZero'),true);return;}
  var created=(F.acc==='__new')||(!F.acc&&!S.accounts.length);
  ensureAcc();
  var a=acc(F.acc),n=0,L=S.learn=S.learn||{},mc={},minD='9999-99-99',maxD='';
  sel.forEach(function(r){
    var mk=r.date.slice(0,7);mc[mk]=(mc[mk]||0)+1;if(r.date<minD)minD=r.date;if(r.date>maxD)maxD=r.date;
    if(r.cat==='withdraw'){
      var cashA=S.accounts.filter(function(x){return x.type==='cash'&&x.cur===F.cur;})[0]||S.accounts.filter(function(x){return x.type==='cash';})[0];
      if(!cashA){cashA={id:uid(),name:t('at_cash'),type:'cash',cur:F.cur,open:0,since:r.date};S.accounts.push(cashA);}
      else if(cashA.since>r.date)cashA.since=r.date;
      if(F.acc&&F.acc!==cashA.id){S.tx.push(mkTx(r.date,'tr',r.amt,F.cur,'',r.label,F.acc,{to:cashA.id}));n++;}
      return;
    }
    var inc=r.cat==='inc',extra={sub:(!inc&&r.cat==='family')?(r.sub||'mobile'):'',post:postOk(inc?'inc':'exp',inc?'':r.cat,r.post)};
    if(r.rec){
      var rk=keyOf(r.lk||r.label),ex=S.rec.filter(function(x){return rk&&x.type===(inc?'inc':'exp')&&keyOf(x.name)===rk;})[0];
      if(!ex){ex={id:uid(),type:inc?'inc':'exp',name:String(r.label).slice(0,40),amt:r.amt,cur:F.cur,day:+r.date.slice(8,10),from:mk,to:'',cat:inc?'':r.cat,sub:extra.sub,acc:F.acc||'',post:extra.post};S.rec.push(ex);}
      if(ex.from&&mk<ex.from)ex.from=mk;
      extra.recId=ex.id;
    }
    S.tx.push(mkTx(r.date,inc?'inc':'exp',r.amt,F.cur,inc?'':r.cat,r.label,F.acc,extra));
    n++;
    var k=keyOf(r.lk||r.label);if(k&&(r.cat!==r.guess||!r.known))L[k]=r.cat;
    if(k&&r.recSet){S.learnRec=S.learnRec||{};S.learnRec[k]=!!r.rec;}
    if(k&&r.postSet&&extra.post){S.learnPost=S.learnPost||{};S.learnPost[k]=extra.post;}
  });
  var ks=Object.keys(L);if(ks.length>300)ks.slice(0,ks.length-300).forEach(function(k){delete L[k];});
  if(a&&created&&minD<a.since)a.since=minD;
  if(a&&F.bal&&F.setBal&&a.cur===F.cur&&a.type!=='loan'){var bd=F.bal.date||maxD;if(a.since<=bd)a.open+=F.bal.amt-accBal(a,bd);}
  if(F.fileKey&&F.fileKey.length>=3&&F.acc){S.learnAcc=S.learnAcc||{};S.learnAcc[F.fileKey]=F.acc;}
  UI.lastCur=F.cur;var bm=Object.keys(mc).sort(function(a,b){return mc[b]-mc[a]||(a<b?1:-1);})[0];if(bm){VM=bm;TAB='home';}
  save();closeSheet();render();window.scrollTo(0,0);toast(n+' '+t('impDone')+(bm?' · '+mlabel(bm):''));
};
ACT.rateNow=function(){autoRate(true);};
window.MRX={toLines:toLines,parseCSV:parseCSV,parseLines:parseLines,guessRow:guessRow,parseAmt:parseAmt,parseDate:parseDate,keyOf:keyOf};

/* ---------- exchange rate (automatic, ECB reference via frankfurter) ---------- */
function fetchRate(){
  var urls=['https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD','https://api.frankfurter.app/latest?from=EUR&to=USD'];
  function at(i){
    if(i>=urls.length)return Promise.reject(new Error('rate'));
    return fetch(urls[i]).then(function(r){if(!r.ok)throw new Error('http');return r.json();}).then(function(j){
      var v=j&&j.rates&&j.rates.USD;if(!(v>0.5&&v<2.5))throw new Error('bad');return {usd:v,date:j.date};
    }).catch(function(){return at(i+1);});
  }
  return at(0);
}
function autoRate(force){
  if(typeof fetch!=='function')return;
  if(!force&&!rateDue())return;
  fetchRate().then(function(r){S.rates={usd:r.usd,updated:ymd(new Date()),auto:true};nfCache={};save();render();if(force)toast(t('rateOk'));}).catch(function(){if(force)toast(t('rateFail'),true);});
}

/* ---------- field edits ---------- */
var FIELD={
  varPlan:function(el){S.varPlan=readEur(el);},
  sendMin:function(el){mset(VM).sendMin=readEur(el);},
  sendMax:function(el){mset(VM).sendMax=readEur(el);}
};
SENDS.forEach(function(s){FIELD['plan_'+s]=function(el){var m=mset(VM);m.plan=m.plan||{};m.plan[s]=readEur(el);};});
document.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b)return;var nm=b.getAttribute('data-a'),f=ACT[nm];if(LOCKED[nm]&&isLocked()){ACT.paywall();return;}if(f)f(b.getAttribute('data-v'),b);});
function sheetField(el){if(F&&el.hasAttribute('data-s'))F[el.getAttribute('data-s')]=el.value;}
function setRule(key,val){
  var R=S.rule,nr={n:R.n,w:R.w,s:R.s},v=Math.max(0,Math.min(100,Math.round(num(val)||0))),o=['n','w','s'].filter(function(k){return k!==key;}),rest=100-v,so=nr[o[0]]+nr[o[1]];
  var a=so>0?Math.round(rest*nr[o[0]]/so):Math.round(rest/2);
  nr[key]=v;nr[o[0]]=a;nr[o[1]]=rest-a;applyRule(nr);save();render();
}
function applyField(el){
  if(el.hasAttribute('data-f')){var f=FIELD[el.getAttribute('data-f')];if(f){f(el);save();refresh();}}
  else if(el.hasAttribute('data-l')){
    var list=S[el.getAttribute('data-l')],id=el.getAttribute('data-i'),p=el.getAttribute('data-p');
    for(var i=0;i<list.length;i++){if(list[i].id===id)list[i][p]=(p==='amt')?num(el.value):el.value;}
    save();refresh();
  }
}
document.addEventListener('input',function(e){
  var el=e.target;sheetField(el);
  if(el.hasAttribute('data-sim')&&UI.sim){UI.sim[el.getAttribute('data-sim')]=el.value;var so=$('simout');if(so)so.innerHTML=simOut();return;}
  if(el.id==='est-in'){var o=$('est-out');if(o)o.textContent='≈ '+fcfa(toEur(num(el.value),S.disp));return;}
  if(TAB==='send'&&!SH&&!isLocked())applyField(el);
});
document.addEventListener('change',function(e){
  var el=e.target;
  if(el.id==='imp-file'){handleFile(el.files);return;}
  if(el.hasAttribute('data-imp')&&F&&F.rows){
    var r=F.rows[+el.getAttribute('data-imp')];
    if(r){var kk=el.getAttribute('data-k');if(kk==='on'){r.on=el.checked;redrawSheet();}else if(kk==='rec'){r.rec=el.checked;r.recSet=true;}else if(kk==='post'){r.post=el.value;r.postSet=true;}else{r.cat=el.value;r.post='';var pg0=postGuess(norm(r.label));if(pg0&&pg0.cat===el.value)r.post=pg0.post;r.known=true;if(el.value==='family'&&!r.sub)r.sub='mobile';r.remit=r.remit||el.value==='family';redrawSheet();}}
    return;
  }
  if(el.hasAttribute('data-gc')){S.country=el.value;save();render();return;}
  if(el.hasAttribute('data-ui')){UI[el.getAttribute('data-ui')]=el.value;render();return;}
  if(el.hasAttribute('data-ms')&&F){msChange(el);return;}
  if(el.hasAttribute('data-rule')){setRule(el.getAttribute('data-rule'),el.value);return;}
  if(F&&!F.id&&!F.recTouched&&F.mode&&F.mode!=='tr'&&(el.id==='s-note'||el.id==='s-amt'||el.id==='s-date')){
    sheetField(el);
    var hit=histRec(F.note||'',num(F.amt),F.date||ymd(new Date()),F.mode==='inc');
    if(hit&&!F.rec){F.rec=true;var cb=document.querySelector('.sheet [data-a=st][data-v=rec]');if(cb)cb.setAttribute('aria-pressed','true');var hn=$('rec-hint');if(hn)hn.textContent=t('recSeen');}
    return;
  }
  sheetField(el);if(F&&F.step&&el.id==='s-acc'){F.autoAcc=false;redrawSheet();return;}applyField(el);
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&SH)closeSheet();});
(function(){
  var h=(location.hash||'').replace(/^#/,'');if(!h||h.indexOf('type=recovery')<0)return;
  var q={};h.split('&').forEach(function(p){var i=p.indexOf('=');if(i>0)q[p.slice(0,i)]=decodeURIComponent(p.slice(i+1));});
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  if(q.access_token){AUTH.recovery={access:q.access_token,refresh:q.refresh_token||'',exp:+q.expires_in||3600};AUTH.session=null;authSave();AUTH.guest=false;AUTH.mode='reset';}
})();
if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
render();try{notifyDue();}catch(e){}
if(cloud()&&AUTH.session){pull().then(function(){render();autoRate(false);});}else autoRate(false);
})();
