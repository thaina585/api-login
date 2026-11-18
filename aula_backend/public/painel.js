const $ = (id) => document.getElementById(id);

function lerToken() {
  try { return localStorage.getItem('token'); } catch { return null; }
}

function sair() {
  try { localStorage.removeItem('token'); } catch { /* ignora */ }
  location.href = '/';
}

async function carregar() {
  const token = lerToken();
  if (!token) return sair(); // sem token: volta para o login

  try {
    // A página só mostra os dados se o SERVIDOR confirmar que o token é válido.
    const resposta = await fetch('/api/eu', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (resposta.status === 401) return sair(); // token vencido ou falso

    if (!resposta.ok) throw new Error();

    const usuario = await resposta.json();
    const primeiroNome = usuario.nome.split(' ')[0];

    // textContent (e não innerHTML) impede que um nome malicioso vire código.
    $('saudacao').textContent = `Olá, ${primeiroNome}!`;
    $('dado-nome').textContent = usuario.nome;
    $('dado-email').textContent = usuario.email;
    $('dado-criado').textContent = new Date(usuario.criado_em).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    $('carregando').hidden = true;
    $('area').hidden = false;
  } catch {
    $('carregando').textContent = 'Não foi possível carregar seus dados. Recarregue a página.';
  }
}

$('botao-sair').addEventListener('click', sair);
carregar();
