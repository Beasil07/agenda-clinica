// Tela do sistema: login, agenda e pacientes.
import * as banco from './banco.js';
import {
  HORARIOS, STATUS, consultaAtiva, dataISO, filtrarPacientes, horarioLivre, idConsulta, mensagemDeErro,
  ordenarPorHora, validarConsulta, validarPaciente,
} from './regras.js';

const el = id => document.getElementById(id);
let pacientes = [];
let consultas = [];
let consultaEditada = null;
let pacienteEditado = null;

function avisar(id, texto, erro = false) {
  el(id).textContent = texto;
  el(id).classList.toggle('erro', erro);
}

function limparAvisos() {
  ['msgConsulta', 'msgPaciente'].forEach(id => avisar(id, ''));
}

function escapar(texto) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texto).replace(/[&<>"']/g, caractere => mapa[caractere]);
}

function confirmar(texto) {
  return new Promise(resolver => {
    const dialogo = el('dialogo');
    const responder = resposta => {
      dialogo.close();
      resolver(resposta);
    };
    el('dialogoTexto').textContent = texto;
    el('dialogoSim').onclick = () => responder(true);
    el('dialogoNao').onclick = () => responder(false);
    dialogo.oncancel = () => resolver(false); // tecla Esc
    dialogo.showModal();
  });
}

// Bloqueia o botão durante a operação para evitar envio duplicado e mostra erros em português.
async function executar(botao, idAviso, acao) {
  botao.disabled = true;
  try {
    return await acao();
  } catch (erro) {
    avisar(idAviso, mensagemDeErro(erro), true);
  } finally {
    botao.disabled = false;
  }
}

function preencherPacientes() {
  const selecionado = el('consultaPaciente').value;
  const lista = filtrarPacientes(pacientes, '');
  el('consultaPaciente').innerHTML = '<option value="">Selecione</option>' +
    lista.map(paciente => `<option value="${escapar(paciente.id)}">${escapar(paciente.nome)}</option>`).join('');
  el('consultaPaciente').value = selecionado;
}

function desenharPacientes() {
  const lista = filtrarPacientes(pacientes, el('buscaPaciente').value);
  el('tabelaPacientes').innerHTML = lista.map(paciente => `<tr>
    <td>${escapar(paciente.nome)}</td><td>${escapar(paciente.telefone || '-')}</td><td>${escapar(paciente.observacao || '-')}</td>
    <td><button type="button" data-editar="${escapar(paciente.id)}">Editar</button>
    <button type="button" class="perigo" data-excluir="${escapar(paciente.id)}">Excluir</button></td>
  </tr>`).join('') || '<tr><td colspan="4" class="suave">Nenhum paciente encontrado.</td></tr>';
}

function desenharConsultas() {
  el('tabelaConsultas').innerHTML = ordenarPorHora(consultas).map(consulta => {
    const paciente = pacientes.find(item => item.id === consulta.pacienteId);
    const opcoes = Object.entries(STATUS).map(([valor, rotulo]) =>
      `<option value="${valor}" ${valor === consulta.status ? 'selected' : ''}>${rotulo}</option>`).join('');
    return `<tr>
      <td>${escapar(consulta.hora)}</td><td>${escapar(paciente?.nome ?? 'Paciente excluído')}</td>
      <td>${escapar(paciente?.telefone || '-')}</td>
      <td><select data-status="${escapar(consulta.id)}" aria-label="Situação da consulta das ${escapar(consulta.hora)}">${opcoes}</select></td>
      <td><button type="button" data-editar="${escapar(consulta.id)}">Editar</button>
      <button type="button" class="perigo" data-excluir="${escapar(consulta.id)}">Excluir</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" class="suave">Nenhuma consulta neste dia.</td></tr>';
}

async function carregarPacientes() {
  pacientes = await banco.listarPacientes();
  preencherPacientes();
  desenharPacientes();
}

async function carregarConsultas() {
  consultas = await banco.listarConsultasDoDia(el('filtroData').value);
  desenharConsultas();
}

function sairDaEdicaoConsulta() {
  consultaEditada = null;
  el('formConsulta').reset();
  el('consultaData').value = el('filtroData').value;
  el('tConsulta').textContent = 'Nova consulta';
  el('btnSalvarConsulta').textContent = 'Marcar consulta';
  el('btnCancelarConsulta').hidden = true;
}

function sairDaEdicaoPaciente() {
  pacienteEditado = null;
  el('formPaciente').reset();
  el('tPaciente').textContent = 'Novo paciente';
  el('btnSalvarPaciente').textContent = 'Cadastrar';
  el('btnCancelarPaciente').hidden = true;
}

function mostrarAba(aba) {
  const agenda = aba === 'agenda';
  el('secAgenda').hidden = !agenda;
  el('secPacientes').hidden = agenda;
  el('abaAgenda').setAttribute('aria-pressed', agenda);
  el('abaPacientes').setAttribute('aria-pressed', !agenda);
  limparAvisos();
}

async function autenticar(botao, acao) {
  avisar('msgLogin', '');
  const email = el('loginEmail').value.trim();
  const senha = el('loginSenha').value;
  if (!email || !senha) return avisar('msgLogin', 'Informe o e-mail e a senha.', true);
  await executar(botao, 'msgLogin', () => acao(email, senha));
}

el('formLogin').addEventListener('submit', evento => {
  evento.preventDefault();
  autenticar(evento.submitter, banco.entrar);
});
el('btnCriarConta').addEventListener('click', evento => autenticar(evento.currentTarget, banco.criarConta));
el('btnSair').addEventListener('click', () => banco.sair());
el('abaAgenda').addEventListener('click', () => mostrarAba('agenda'));
el('abaPacientes').addEventListener('click', () => mostrarAba('pacientes'));
el('buscaPaciente').addEventListener('input', desenharPacientes);
el('btnCancelarConsulta').addEventListener('click', sairDaEdicaoConsulta);
el('btnCancelarPaciente').addEventListener('click', sairDaEdicaoPaciente);

el('filtroData').addEventListener('change', async () => {
  limparAvisos();
  if (!consultaEditada) el('consultaData').value = el('filtroData').value;
  if (!el('filtroData').value) return;
  try {
    await carregarConsultas();
  } catch (erro) {
    avisar('msgConsulta', mensagemDeErro(erro), true);
  }
});

el('formConsulta').addEventListener('submit', evento => {
  evento.preventDefault();
  limparAvisos();
  const dados = {
    pacienteId: el('consultaPaciente').value,
    data: el('consultaData').value,
    hora: el('consultaHora').value,
    status: el('consultaStatus').value,
  };
  const erro = validarConsulta(dados);
  if (erro) return avisar('msgConsulta', erro, true);

  executar(evento.submitter, 'msgConsulta', async () => {
    await banco.salvarConsulta(dados, consultaEditada);
    const texto = consultaEditada ? 'Consulta alterada.' : 'Consulta marcada.';
    el('filtroData').value = dados.data;
    sairDaEdicaoConsulta();
    await carregarConsultas();
    avisar('msgConsulta', texto);
  });
});

el('tabelaConsultas').addEventListener('click', async evento => {
  const { editar, excluir } = evento.target.dataset;
  if (editar) {
    const consulta = consultas.find(item => item.id === editar);
    consultaEditada = editar;
    el('consultaPaciente').value = consulta.pacienteId;
    el('consultaData').value = consulta.data;
    el('consultaHora').value = consulta.hora;
    el('consultaStatus').value = consulta.status;
    el('tConsulta').textContent = 'Editar consulta';
    el('btnSalvarConsulta').textContent = 'Salvar alteração';
    el('btnCancelarConsulta').hidden = false;
    el('consultaPaciente').focus();
  }
  if (excluir && await confirmar('Excluir esta consulta?')) {
    limparAvisos();
    await executar(evento.target, 'msgConsulta', async () => {
      await banco.excluirConsulta(excluir);
      if (consultaEditada === excluir) sairDaEdicaoConsulta();
      await carregarConsultas();
      avisar('msgConsulta', 'Consulta excluída.');
    });
  }
});

el('tabelaConsultas').addEventListener('change', evento => {
  const id = evento.target.dataset.status;
  if (!id) return;
  limparAvisos();
  executar(evento.target, 'msgConsulta', async () => {
    try {
      await banco.alterarStatus(id, evento.target.value);
      avisar('msgConsulta', 'Situação atualizada.');
    } finally {
      await carregarConsultas();
    }
  });
});

el('formPaciente').addEventListener('submit', evento => {
  evento.preventDefault();
  limparAvisos();
  const dados = {
    nome: el('pacienteNome').value.trim(),
    telefone: el('pacienteTelefone').value.trim(),
    observacao: el('pacienteObservacao').value.trim(),
  };
  const erro = validarPaciente(dados);
  if (erro) return avisar('msgPaciente', erro, true);

  executar(evento.submitter, 'msgPaciente', async () => {
    if (pacienteEditado) await banco.editarPaciente(pacienteEditado, dados);
    else await banco.criarPaciente(dados);
    const texto = pacienteEditado ? 'Paciente alterado.' : 'Paciente cadastrado.';
    sairDaEdicaoPaciente();
    await carregarPacientes();
    desenharConsultas();
    avisar('msgPaciente', texto);
  });
});

el('tabelaPacientes').addEventListener('click', async evento => {
  const { editar, excluir } = evento.target.dataset;
  if (editar) {
    const paciente = pacientes.find(item => item.id === editar);
    pacienteEditado = editar;
    el('pacienteNome').value = paciente.nome;
    el('pacienteTelefone').value = paciente.telefone;
    el('pacienteObservacao').value = paciente.observacao;
    el('tPaciente').textContent = 'Editar paciente';
    el('btnSalvarPaciente').textContent = 'Salvar alteração';
    el('btnCancelarPaciente').hidden = false;
    el('pacienteNome').focus();
  }
  if (excluir) {
    limparAvisos();
    await executar(evento.target, 'msgPaciente', async () => {
      const marcadas = await banco.listarConsultasDoPaciente(excluir);
      if (marcadas.some(consultaAtiva)) {
        return avisar('msgPaciente', 'Este paciente tem consultas agendadas ou confirmadas.', true);
      }
      if (!await confirmar('Excluir este paciente?')) return;
      await banco.excluirPaciente(excluir);
      if (pacienteEditado === excluir) sairDaEdicaoPaciente();
      await carregarPacientes();
      desenharConsultas();
      avisar('msgPaciente', 'Paciente excluído.');
    });
  }
});

banco.observarUsuario(async usuario => {
  el('carregando').hidden = true;
  el('telaLogin').hidden = Boolean(usuario);
  el('telaApp').hidden = !usuario;
  el('areaUsuario').hidden = !usuario;
  pacientes = [];
  consultas = [];
  el('formLogin').reset();
  avisar('msgLogin', '');
  if (!usuario) return;

  el('emailUsuario').textContent = usuario.email;
  mostrarAba('agenda');
  el('filtroData').value = dataISO();
  sairDaEdicaoConsulta();
  sairDaEdicaoPaciente();
  try {
    await Promise.all([carregarPacientes(), carregarConsultas()]);
  } catch (erro) {
    avisar('msgConsulta', mensagemDeErro(erro), true);
  }
});

el('consultaHora').innerHTML = HORARIOS.map(hora => `<option>${hora}</option>`).join('');
el('consultaStatus').innerHTML = Object.entries(STATUS).map(([valor, rotulo]) => `<option value="${valor}">${rotulo}</option>`).join('');
