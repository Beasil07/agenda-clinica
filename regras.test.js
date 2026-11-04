import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HORARIOS, consultaAtiva, filtrarPacientes, horarioLivre, idConsulta, mensagemDeErro, ordenarPorHora,
  validarConsulta, validarPaciente,
} from './regras.js';

test('gera horários de 30 em 30 minutos entre 08:00 e 18:00', () => {
  assert.equal(HORARIOS[0], '08:00');
  assert.equal(HORARIOS[1], '08:30');
  assert.equal(HORARIOS.at(-1), '18:00');
});

test('usa data e hora como id, impedindo dois documentos no mesmo horário', () => {
  assert.equal(idConsulta({ data: '2026-11-04', hora: '09:30' }), '2026-11-04_09:30');
});

test('horário vazio ou cancelado fica livre', () => {
  assert.equal(horarioLivre(undefined), true);
  assert.equal(horarioLivre({ status: 'cancelada' }), true);
  assert.equal(horarioLivre({ status: 'agendada' }), false);
  assert.equal(horarioLivre({ status: 'realizada' }), false);
});

test('identifica consultas ativas', () => {
  assert.equal(consultaAtiva({ status: 'confirmada' }), true);
  assert.equal(consultaAtiva({ status: 'faltou' }), false);
});

test('valida paciente', () => {
  assert.notEqual(validarPaciente({ nome: '', telefone: '', observacao: '' }), '');
  assert.notEqual(validarPaciente({ nome: 'a'.repeat(81), telefone: '', observacao: '' }), '');
  assert.equal(validarPaciente({ nome: 'Ana Exemplo', telefone: '', observacao: '' }), '');
});

test('valida consulta', () => {
  const consulta = { pacienteId: '1', data: '2026-11-04', hora: '09:00', status: 'agendada' };
  assert.equal(validarConsulta(consulta), '');
  assert.notEqual(validarConsulta({ ...consulta, pacienteId: '' }), '');
  assert.notEqual(validarConsulta({ ...consulta, data: '' }), '');
  assert.notEqual(validarConsulta({ ...consulta, hora: '09:15' }), '');
  assert.notEqual(validarConsulta({ ...consulta, status: 'outra' }), '');
});

test('ordena consultas sem alterar a lista original', () => {
  const lista = [{ hora: '10:00' }, { hora: '08:30' }];
  assert.deepEqual(ordenarPorHora(lista).map(item => item.hora), ['08:30', '10:00']);
  assert.equal(lista[0].hora, '10:00');
});

test('busca pacientes sem diferenciar maiúsculas e ordena por nome', () => {
  const pacientes = [{ nome: 'Bruno Fictício' }, { nome: 'Ana Exemplo' }];
  assert.deepEqual(filtrarPacientes(pacientes, '').map(item => item.nome), ['Ana Exemplo', 'Bruno Fictício']);
  assert.deepEqual(filtrarPacientes(pacientes, 'BRUNO').map(item => item.nome), ['Bruno Fictício']);
});

test('traduz erros conhecidos e usa mensagem genérica nos demais', () => {
  assert.equal(mensagemDeErro({ code: 'horario-ocupado' }), 'Já existe uma consulta neste horário.');
  assert.equal(mensagemDeErro({ code: 'desconhecido' }), 'Não foi possível concluir. Tente novamente.');
});
