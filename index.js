// Imports
const express = require('express');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Definição de DB
const DB_FILE = 'db.json';

// Para trabalhar usando JSON
app.use(express.json()); 
app.use(express.static('public'));

// Rota raiz
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Função para ler dados no DB
const lerTransacoes = async () => {
  try {
    const dados = await fs.readJson(DB_FILE);
    return dados;
  } catch (error) {
    return []; // Se o arquivo estiver vazio ou com erro, retorna array vazio
  }
};

// Funcão para ler categorias
const lerCategorias = async () => {
  try {
    const categorias = await fs.readJson('categorias.json');
    return categorias;
  } catch (error) {
    return "Erro ao carregar categorias.";
  }
};

// Func para salvar dados no DB
const salvarTransacoes = async (transacoes) => {
  await fs.writeJson(DB_FILE, transacoes, { spaces: 2 }); //DB_FILE (onde salvar) transacoes (objeto a ser salvo) { spaces } (configuração de identação)
};

// Rota para registrar entrada (receita)
app.post('/entrada', async (req, res) => {
  const { valor, descricao, categoria } = req.body;

  if (!valor || valor <= 0) {
    return 'Valor inválido para a entrada.';
  }

  const transacoes = await lerTransacoes();
  const novaEntrada = {
      id: uuidv4(),
      tipo: 'entrada',
      valor,
      descricao,
      categoria,
      data: new Date(),
    };
  transacoes.push(novaEntrada);

  await salvarTransacoes(transacoes);

  res.send('Transação adicionada com sucesso');

});

// Rota para registrar saída
app.post('/saida', async (req, res) => {
  const { valor, descricao, categoria } = req.body;

  if (!valor || valor <= 0) {
    return 'Valor inválido para a saída.';
  }

  const transacoes = await lerTransacoes();
  const novaSaida = {
    id: uuidv4(),
    tipo: 'saida',
    valor,
    descricao,
    categoria,
    data: new Date(),
  };
  transacoes.push(novaSaida);

  await salvarTransacoes(transacoes);

  res.send('Transação adicionada com sucesso');
});

// Rota para visualizar as transações
app.get('/transacoes', async (req, res) => {
  const transacoes = await lerTransacoes();
  res.json(transacoes);
});

// Rota para calcular o lucro
app.get('/lucro', async (req, res) => {
  const transacoes = await lerTransacoes();

  const entradas = transacoes.filter(t => t.tipo === 'entrada');
  const saidas = transacoes.filter(t => t.tipo === 'saida');

  const totalEntradas = entradas.reduce((acc, t) => acc + t.valor, 0);
  const totalSaidas = saidas.reduce((acc, t) => acc + t.valor, 0);
  const lucro = totalEntradas - totalSaidas;

  res.json({
    lucro,
    totalEntradas,
    totalSaidas
  });
});

// Rota para deletar ID
app.delete('/transacoes/:id', async (req, res) => {
  const { id } = req.params;

  const transacoes = await lerTransacoes();
  const novaLista = transacoes.filter(t => t.id !== id);

  if (novaLista.length === transacoes.length) {
    return 'Transação não encontrada para exclusão.';
  }

  await salvarTransacoes(novaLista);

  res.send('Transação excluída com sucesso');
});

// Rota para editar ID
app.put('/transacoes/:id', async (req, res) => {
  const { id } = req.params;
  const { valor, descricao, categoria } = req.body;

  const transacoes = await lerTransacoes();
  const transacao = transacoes.find(t => t.id === id);

  if (!transacao) {
    return res.send('Transação não encontrada.');
  }

  // Atualiza os campos informados
  if (valor !== undefined) {
    if (valor <= 0) return res.send('Valor inválido.');
    transacao.valor = valor;
  }

  if (descricao !== undefined) {
    transacao.descricao = descricao;
  }

  if (categoria !== undefined){
    transacao.categoria = categoria;
  }

  await salvarTransacoes(transacoes);

  res.json(transacao);
});

// Filtros
app.get('/transacoes/filtrar', async (req, res) => {
  const { categoria, inicio, fim, tipo } = req.query;

  const transacoes = await lerTransacoes();
  let filtradas = transacoes;

  // Filtro por categoria
  if (categoria) {
    filtradas = filtradas.filter(t => t.categoria === categoria);
  }

  // Filtro por  datas
  if (inicio && fim) {
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    filtradas = filtradas.filter(t => {
      const data = new Date(t.data);
      return data >= dataInicio && data <= dataFim;
    });
  }

  // Filtro por tipo
  if (tipo) {
    filtradas = filtradas.filter(t => t.tipo === tipo);
  }

  if (filtradas.length === 0) {
    return res.send('Nenhuma transação encontrada com os critérios fornecidos.');
  }

  res.json(filtradas);
});

// Puxar categorias para o select do Front-end
app.get('/categorias', async (req, res) => {
  const { tipo } = req.query;

  try {
    const categorias = await fs.readJson('categorias.json');

    if (tipo && categorias[tipo]) {
      return res.json(categorias[tipo]);
    }

    return res.send('Tipo de categoria inválido ou não informado.');
  } catch (error) {
    res.send('Erro ao ler o arquivo de categorias.');
  }
});

// Configuração do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});