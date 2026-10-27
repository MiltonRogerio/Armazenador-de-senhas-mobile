import { encrypt, decrypt } from "./crypto-mobile.js";

const FILE_NAME = 'cofre-seguro-backup.txt';

function skPrompt(titulo, desc){
  return new Promise(resolve=>{
    document.getElementById('sk-title').innerText=titulo;
    document.getElementById('sk-desc').innerText=desc;
    const input = document.getElementById('sk-input');
    input.value='';
    document.getElementById('sk-modal').classList.remove('sk-hidden');
    setTimeout(()=>input.focus(),100);
    const ok=document.getElementById('sk-confirm');
    const cancel=document.getElementById('sk-cancel');
    const close=(val)=>{document.getElementById('sk-modal').classList.add('sk-hidden');resolve(val);}
    ok.onclick=()=>close(input.value);
    cancel.onclick=()=>close(null);
    input.onkeydown=(e)=>{ if(e.key==='Enter') close(input.value); };
  });
}

function skAlert(msg){
  const t=document.getElementById('sk-toast');
  t.innerText=msg; t.classList.remove('sk-hidden');
  setTimeout(()=>t.classList.add('sk-hidden'),4000);
}

async function exportarCofre(){
  const senha = await skPrompt('Exportar Cofre','Crie uma senha forte para seu backup');
  if(!senha) return;
  try {
    const Pref = Capacitor.Plugins.Preferences;
    const { keys } = await Pref.keys();
    let all = {};
    for(let k of keys){ const v = await Pref.get({key:k}); all[k]=v.value; }
    if(!Object.keys(all).length){ skAlert('Cofre vazio!'); return; }
    
    // AGORA 100% OFFLINE - usa seu crypto-mobile.js
    const cripto = await encrypt(JSON.stringify(all), senha);
    
    const Fs = Capacitor.Plugins.Filesystem;
    await Fs.writeFile({ path: FILE_NAME, data: cripto, directory: 'DOCUMENTS', encoding: 'utf8' });
    skAlert('✅ Salvo em Documentos > '+FILE_NAME);
  } catch(e){ skAlert('Erro: '+e.message); console.error(e); }
}

async function importarCofre(){
  const senha = await skPrompt('Importar Cofre','Digite a senha do seu backup');
  if(!senha) return;
  const input = document.createElement('input');
  input.type='file'; input.accept='.txt';
  input.onchange = async(ev)=>{
    try{
      const text = await ev.target.files[0].text();
      const dec = await decrypt(text, senha);
      if(!dec) throw new Error();
      const dados = JSON.parse(dec);
      const Pref = Capacitor.Plugins.Preferences;
      for(let k in dados) await Pref.set({key:k, value:dados[k]});
      skAlert('✅ Cofre restaurado!'); 
      setTimeout(()=>location.reload(),1200);
    }catch(err){ skAlert('❌ Senha errada ou arquivo inválido'); }
  };
  input.click();
}

window.exportarCofre = exportarCofre;
window.importarCofre = importarCofre;