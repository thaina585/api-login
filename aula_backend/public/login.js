const $ = (id) => document.getElementById(id);
let modoCadastro = false;

// Se já está logado, vai direto para a área logada.
try {
  if (localStorage.getItem('token')) location.href = 'painel.html';
} catch { /* navegador sem armazenamento */ }

function mostrarErro(texto) {
  $('mensagem').textContent = texto;
}

function alternarModo() {
  modoCadastro = !modoCadastro;
  $('titulo').textContent = modoCadastro ? 'Criar conta' : 'Entrar';
  $('subtitulo').textContent = modoCadastro ? 'Leva menos de um minuto.' : 'Acesse sua conta para continuar.';
  $('botao-enviar').textContent = modoCadastro ? 'Criar conta' : 'Entrar';
  $('texto-alternar').textContent = modoCadastro ? 'Já tem conta?' : 'Não tem conta?';
  $('botao-alternar').textContent = modoCadastro ? 'Entrar' : 'Criar conta';
  $('campo-nome').hidden = !modoCadastro;
  $('senha').autocomplete = modoCadastro ? 'new-password' : 'current-password';
  mostrarErro('');
}

async function enviar(evento) {
  evento.preventDefault();

  const dados = { email: $('email').value.trim(), senha: $('senha').value };
  if (modoCadastro) dados.nome = $('nome').value.trim();

  // Validação rápida no navegador (o servidor confere de novo, sempre).
  if (modoCadastro && dados.nome.length < 2) return mostrarErro('Informe seu nome.');
  if (!dados.email) return mostrarErro('Informe seu e-mail.');
  if (dados.senha.length < 6) return mostrarErro('A senha precisa ter pelo menos 6 caracteres.');

  const botao = $('botao-enviar');
  botao.disabled = true;
  mostrarErro('');

  try {
    const resposta = await fetch(modoCadastro ? '/api/cadastro' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const corpo = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      mostrarErro(corpo.erro || 'Não foi possível entrar. Tente de novo.');
      return;
    }

    localStorage.setItem('token', corpo.token);
    location.href = 'painel.html';
  } catch {
    mostrarErro('Sem conexão com o servidor. Tente de novo.');
  } finally {
    botao.disabled = false;
  }
}

$('formulario').addEventListener('submit', enviar);
$('botao-alternar').addEventListener('click', alternarModo);
