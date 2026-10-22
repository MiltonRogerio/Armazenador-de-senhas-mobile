import * as Vaults from "./vaults-mobile.js";

let cofreAtual = null;
let masterAtual = null;
let senhas = [];

const $ = id => document.getElementById(id);

window.irParaRegistro = () => {
  $("tela-selecionar").style.display="none";
  $("tela-login").style.display="none";
  $("tela-registro").style.display="block";
}
window.voltarParaSelecao = () => {
  $("tela-selecionar").style.display="block";
  $("tela-login").style.display="none";
  $("tela-registro").style.display="none";
  $("tela-app").style.display="none";
  listarCofres();
}
window.mostrarAba = (aba) => {
  $("aba-lista").style.display = aba==="lista" ? "block":"none";
  $("aba-add").style.display = aba==="add" ? "block":"none";
  $("tab-lista").classList.toggle("active", aba==="lista");
  $("tab-add").classList.toggle("active", aba==="add");
}

async function listarCofres() {
  const lista = await Vaults.getVaults();
  const div = $("lista-cofres");
  div.innerHTML = "";
  if (lista.length===0) { div.innerHTML="<p style='opacity:.5;text-align:center'>Nenhum cofre criado</p>"; return; }
  lista.forEach(v => {
    const el = document.createElement("div");
    el.className="item"; el.style.cursor="pointer";
    el.innerHTML=`<div class="item-info"><b>${v.name}</b></div><div class="item-actions"><button class="icon-btn delete" data-del="${v.name}">🗑️</button></div>`;
    el.onclick = (e) => { if(e.target.dataset.del) return; abrirLogin(v.name); };
    el.querySelector("[data-del]").onclick = (e) => { e.stopPropagation(); confirmar(`Apagar cofre "${v.name}"?`, async () => { await Vaults.deleteVault(v.name); listarCofres(); }); };
    div.appendChild(el);
  });
}

function abrirLogin(nome) {
  cofreAtual=nome;
  $("cofre-selecionado-nome").innerText=nome;
  $("tela-selecionar").style.display="none";
  $("tela-login").style.display="block";
  $("msg-erro-login").innerText="";
}

$("form-registro").addEventListener("submit", async e=>{
  e.preventDefault();
  const nome=$("reg-usuario").value.trim();
  const s=$("reg-senha").value; const c=$("reg-confirmar").value;
  if(s!==c) return $("msg-erro").innerText="Senhas não conferem";
  try{ await Vaults.createVault(nome,s); $("form-registro").reset(); voltarParaSelecao(); }
  catch(err){ $("msg-erro").innerText=err.message; }
});

$("form-login").addEventListener("submit", async e=>{
  e.preventDefault();
  const block = await Vaults.checkBlock();
  if(block.blocked){ 
    const sec=Math.ceil((block.until-Date.now())/1000); 
    return $("msg-erro-login").innerText=`Bloqueado por ${sec}s`; 
  }
  const senha=$("login-senha").value;
  try{
    await Vaults.loginVault(cofreAtual, senha);
    await Vaults.clearFails();
    masterAtual=senha;
    $("login-senha").value="";
    $("tela-login").style.display="none";
    $("tela-app").style.display="block";
    mostrarAba("lista");
    await carregarSenhas();
  }catch{
    const f = await Vaults.registerFail();
    if(f.count>=3) $("msg-erro-login").innerText="3 tentativas! Aguarde 1 min";
    else $("msg-erro-login").innerText=`Senha incorreta (${f.count}/3)`;
  }
});

async function carregarSenhas(){
  senhas = await Vaults.getPasswords(cofreAtual, masterAtual);
  const div=$("lista-senhas"); div.innerHTML="";
  if(senhas.length===0) div.innerHTML="<p style='opacity:.5'>Nenhuma senha salva</p>";
  senhas.forEach((it, idx)=>{
    const el=document.createElement("div"); el.className="item";
    el.innerHTML=`<div class="item-header"><div class="item-info"><b>${it.site}</b><small>${it.login||""}</small></div><div class="item-actions"><button class="icon-btn" data-copy="${idx}">📋</button><button class="icon-btn" data-show="${idx}">👁️</button><button class="icon-btn delete" data-del="${idx}">🗑️</button></div></div><div class="item-senha-valor" id="pv-${idx}" style="display:none">${it.senha}</div>`;
    
    el.querySelector(`[data-show="${idx}"]`).onclick=()=>{ const v=$(`pv-${idx}`); v.style.display=v.style.display==="none"?"block":"none"; };
    
    el.querySelector(`[data-copy="${idx}"]`).onclick=async ()=>{
      try {
        await navigator.clipboard.writeText(it.senha);
        const btn = el.querySelector(`[data-copy="${idx}"]`);
        const old = btn.innerText;
        btn.innerText = "✓";
        setTimeout(()=> btn.innerText = old, 1000);
      } catch(e) {
        const ta = document.createElement("textarea");
        ta.value = it.senha;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("Copiado!");
      }
    };

    el.querySelector(`[data-del="${idx}"]`).onclick=()=>{ confirmar("Apagar senha?", async()=>{ await Vaults.deletePassword(cofreAtual,masterAtual,idx); carregarSenhas(); }); };
    div.appendChild(el);
  });
}

$("form-add").addEventListener("submit", async e=>{
  e.preventDefault();
  const entry={ site:$("input-site").value, login:$("input-login").value, senha:$("input-senha").value };
  await Vaults.addPassword(cofreAtual, masterAtual, entry);
  $("form-add").reset(); mostrarAba("lista"); carregarSenhas();
});

function gen(len, chars){ let s=""; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }
window.gerarFraca=()=>{$("input-senha").value=gen(8,"abcdefghijklmnopqrstuvwxyz123456789"); toggleDrop(false);};
window.gerarMedia=()=>{$("input-senha").value=gen(12,"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789"); toggleDrop(false);};
window.gerarForte=()=>{$("input-senha").value=gen(16,"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789!@#$%"); toggleDrop(false);};
const toggleDrop=(show)=>$("dropdown-gerar").classList.toggle("show", show);
$("btn-gerar").onclick=()=>toggleDrop(!$("dropdown-gerar").classList.contains("show"));
document.addEventListener("click", e=>{ if(!e.target.closest(".dropdown-gen")) toggleDrop(false); });

$("btn-logout").onclick=()=>{ cofreAtual=null; masterAtual=null; voltarParaSelecao(); };
function confirmar(texto, onOk){
  $("modal-text").innerText=texto; $("modal-confirm").style.display="flex";
  $("modal-ok").onclick=()=>{ $("modal-confirm").style.display="none"; onOk(); };
  $("modal-cancel").onclick=()=>$("modal-confirm").style.display="none";
}

listarCofres();

window.verRaw = async () => {
  const Prefs = window.Capacitor.Plugins.Preferences;
  const v = await Prefs.get({key: 'vaults_data'});
  const raw = v.value || "vazio";

  const modal = document.createElement('div');
  modal.style = `position:fixed;inset:0;z-index:9999;background:#0a0a0f;padding:20px;overflow:auto;font-family:monospace;color:#00e676`;
  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:10px">
      <h2 style="margin:0;color:#00e676;font-size:18px;line-height:1.2">MODO DEBUG - PROVA DE CRIPTOGRAFIA</h2>
      <button onclick="this.parentElement.parentElement.remove()" style="background:#1a2a1f;color:#00e676;border:1px solid #00e676;padding:10px 15px;border-radius:10px;white-space:nowrap">X FECHAR</button>
    </div>
    
    <div style="background:#16161f;border:1px solid #00e676;border-radius:12px;padding:15px;margin-bottom:15px;overflow:hidden">
      <b style="color:#00e676">📁 LOCAL DO ARQUIVO:</b><br>
      <span style="font-size:12px;opacity:.9;word-break:break-all;display:block;margin-top:5px;color:#a7ffcf">/data/data/com.armazenador.senhas/files/shared_prefs/CapacitorStorage.xml</span>
    </div>

    <div style="background:#16161f;border:1px solid #00e676;border-radius:12px;padding:15px;margin-bottom:15px">
      <b style="color:#00e676">🔒 COMO ESTÁ SALVO (AES-256-GCM CRIPTOGRAFADO):</b><br>
      <div style="background:#000;margin-top:10px;padding:10px;border-radius:8px;word-break:break-all;font-size:11px;max-height:220px;overflow:auto;color:#00e676;border:1px solid #1a3a2a">${raw}</div>
      <p style="font-size:12px;color:#00e676;margin-top:10px">⬆️ Impossível ler sem a senha mestra. Tente achar uma senha aí dentro!</p>
    </div>

    <div style="background:#16161f;border:1px solid #00e676;border-radius:12px;padding:15px">
      <b style="color:#00e676">🔓 O QUE O APP MOSTRA DESCRIPTOGRAFADO:</b><br>
      <p style="font-size:13px;opacity:.8;margin-top:10px;color:#a7ffcf">Isso só aparece DEPOIS de digitar a senha mestra correta. O arquivo nunca salva assim.</p>
    </div>
  `;
  document.body.appendChild(modal);
}