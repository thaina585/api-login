require('dotenv').config({ quiet: true });

// Falhar cedo: sem estas configurações o servidor nem liga.
for (const nome of ['DATABASE_URL', 'JWT_SEGREDO']) {
  if (!process.env[nome]) {
    console.error(`ERRO: a variável ${nome} não foi configurada (veja o .env.example).`);
    process.exit(1);
  }
}

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const banco = require('./banco');

const app = express();
const PORTA = process.env.PORT || 3000;

app.set('trust proxy', 1); // no Render, permite ver o IP real de quem acessa
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------

// Erro "esperado", com o status HTTP que deve ser devolvido.
class ErroApp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function gerarLogin(usuario) {
  const token = jwt.sign({ id: usuario.id }, process.env.JWT_SEGREDO, { expiresIn: '1d' });
  return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } };
}

// Confere o token enviado no cabeçalho "Authorization: Bearer <token>".
function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) throw new ErroApp(401, 'Faça login para continuar');
  try {
    req.usuarioId = jwt.verify(token, process.env.JWT_SEGREDO).id;
  } catch {
    throw new ErroApp(401, 'Sessão expirada. Faça login novamente');
  }
  next();
}

// No máximo 20 tentativas de login/cadastro a cada 15 minutos por IP.
const limitarTentativas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos.' }
});

// ---------------------------------------------------------------------
// Rotas da API
// ---------------------------------------------------------------------

app.get('/api/saude', (req, res) => res.json({ ok: true }));

app.post('/api/cadastro', limitarTentativas, async (req, res) => {
  const { nome, email, senha } = req.body;

  if (typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 100) {
    throw new ErroApp(400, 'Informe seu nome (de 2 a 100 letras)');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ErroApp(400, 'Informe um e-mail válido');
  }
  if (typeof senha !== 'string' || senha.length < 6 || senha.length > 100) {
    throw new ErroApp(400, 'A senha precisa ter pelo menos 6 caracteres');
  }

  const emailLimpo = email.trim().toLowerCase();
  const [existente] = await banco.consultar('SELECT id FROM usuarios WHERE email = $1', [emailLimpo]);
  if (existente) throw new ErroApp(409, 'Este e-mail já está cadastrado');

  const senhaHash = await bcrypt.hash(senha, 10);
  const [usuario] = await banco.consultar(
    'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
    [nome.trim(), emailLimpo, senhaHash]
  );

  res.status(201).json(gerarLogin(usuario)); // quem se cadastra já entra logado
});

app.post('/api/login', limitarTentativas, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

  const [usuario] = await banco.consultar('SELECT * FROM usuarios WHERE email = $1', [email]);

  // Mesma mensagem para e-mail ou senha errados: não revela quem tem conta.
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    throw new ErroApp(401, 'E-mail ou senha incorretos');
  }

  res.json(gerarLogin(usuario));
});

// Dados de quem está logado. Usado pela página logada.
app.get('/api/eu', autenticar, async (req, res) => {
  const [usuario] = await banco.consultar(
    'SELECT id, nome, email, criado_em FROM usuarios WHERE id = $1',
    [req.usuarioId]
  );
  if (!usuario) throw new ErroApp(401, 'Conta não encontrada. Faça login novamente');
  res.json(usuario);
});

// ---------------------------------------------------------------------
// Erros: sempre respondidos em JSON
// ---------------------------------------------------------------------

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

app.use((erro, req, res, next) => {
  if (erro instanceof ErroApp) return res.status(erro.status).json({ erro: erro.message });
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor. Tente novamente.' });
});

// ---------------------------------------------------------------------
// Liga o banco e depois o servidor
// ---------------------------------------------------------------------

banco.iniciar()
  .then(() => app.listen(PORTA, () => console.log(`Site rodando em http://localhost:${PORTA}`)))
  .catch(erro => {
    console.error('Não foi possível conectar ao banco de dados:', erro.message);
    process.exit(1);
  });
