// Regras da agenda, sem dependência do Firebase nem da tela.

export const STATUS = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  faltou: 'Faltou',
  cancelada: 'Cancelada',
};

export const HORARIOS = Array.from({ length: 21 }, (_, i) => {
  const minutos = 8 * 60 + i * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});

// O id da consulta é a data com o horário. Assim, o próprio banco garante um documento por horário.
export const idConsulta = ({ data, hora }) => `${data}_${hora}`;

export const horarioLivre = consulta => !consulta || consulta.status === 'cancelada';

export const consultaAtiva = consulta => ['agendada', 'confirmada'].includes(consulta.status);

export function validarPaciente({ nome, telefone, observacao }) {
  if (!nome) return 'Informe o nome do paciente.';
  if (nome.length > 80) return 'O nome pode ter até 80 caracteres.';
  if (telefone.length > 20) return 'O telefone pode ter até 20 caracteres.';
  if (observacao.length > 200) return 'A observação pode ter até 200 caracteres.';
  return '';
}

export function validarConsulta({ pacienteId, data, hora, status }) {
  if (!pacienteId) return 'Selecione um paciente.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'Informe a data da consulta.';
  if (!HORARIOS.includes(hora)) return 'Selecione um horário.';
  if (!STATUS[status]) return 'Selecione uma situação válida.';
  return '';
}

export const ordenarPorHora = consultas => [...consultas].sort((a, b) => a.hora.localeCompare(b.hora));

export function filtrarPacientes(pacientes, busca) {
  const texto = busca.trim().toLocaleLowerCase('pt-BR');
  return pacientes
    .filter(paciente => paciente.nome.toLocaleLowerCase('pt-BR').includes(texto))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function dataISO(data = new Date()) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function mensagemDeErro(erro) {
  const mensagens = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/email-already-in-use': 'Este e-mail já tem uma conta.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
    'permission-denied': 'Você não tem permissão para esta ação.',
    'horario-ocupado': 'Já existe uma consulta neste horário.',
  };
  return mensagens[erro?.code] ?? 'Não foi possível concluir. Tente novamente.';
}
