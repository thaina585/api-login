# Site com login

Site simples com **cadastro, login e uma página só para quem está logado**. Feito com Node.js, Express e PostgreSQL, com HTML, CSS e JavaScript puro. Pronto para o Render.

## Arquivos

```
index.js            servidor e rotas da API
banco.js            conexão com o PostgreSQL e criação da tabela de usuários
public/
  index.html        tela de entrar / criar conta
  login.js          lógica da tela de entrar
  painel.html       página logada
  painel.js         confere o login e mostra os dados
  style.css         aparência das duas páginas
render.yaml         receita para o Render criar o site e o banco
```

## Como funciona

1. Na tela inicial a pessoa entra ou cria uma conta. A senha é guardada como **hash** (bcrypt), nunca como texto.
2. O servidor devolve um **token JWT** (válido por 1 dia), que o navegador guarda.
3. A página logada envia o token para `/api/eu`. Se o servidor confirmar, mostra os dados. Se não, volta para o login.
4. O botão **Sair** apaga o token.

## Publicar no Render

1. Crie um repositório no GitHub e envie os arquivos desta pasta (**Add file → Upload files**). O `render.yaml` precisa ficar na raiz.
2. No Render (render.com), clique em **New → Blueprint** e escolha o repositório.
3. Clique em **Deploy Blueprint** e espere alguns minutos. O endereço do site aparece no serviço `site-login`.

No plano gratuito, o site dorme após 15 minutos sem acesso (o primeiro acesso depois demora cerca de 1 minuto) e o banco gratuito expira 30 dias após ser criado.

## Rodar no computador ou no Codespaces

```bash
npm install
cp .env.example .env   # e preencha DATABASE_URL e JWT_SEGREDO
npm run dev
```

Abra http://localhost:3000.

## Rotas da API

| Método | Rota | O que faz |
|---|---|---|
| POST | /api/cadastro | cria a conta e já devolve o token |
| POST | /api/login | entra e devolve o token |
| GET | /api/eu | dados de quem está logado (exige token) |
| GET | /api/saude | confere se o servidor está no ar |
