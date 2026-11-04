// Comunicação com o Firebase. A configuração abaixo é pública: quem protege os dados são as regras do Firestore.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {
  createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {
  addDoc, collection, deleteDoc, doc, getDocs, getFirestore, query, runTransaction, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { horarioLivre, idConsulta } from './regras.js';

const app = initializeApp({
  apiKey: 'AIzaSyD5N49av0QfgEeXblMohbVhTFjtDLP523s',
  authDomain: 'agenda-clinica-1000a.firebaseapp.com',
  projectId: 'agenda-clinica-1000a',
  storageBucket: 'agenda-clinica-1000a.firebasestorage.app',
  messagingSenderId: '861912606490',
  appId: '1:861912606490:web:1b30af3f51c390df58eea3',
});
const auth = getAuth(app);
const db = getFirestore(app);

const colecao = nome => collection(db, 'usuarios', auth.currentUser.uid, nome);
const documento = (nome, id) => doc(colecao(nome), id);
const comId = resultado => resultado.docs.map(item => ({ id: item.id, ...item.data() }));

export const observarUsuario = aoMudar => onAuthStateChanged(auth, aoMudar);
export const entrar = (email, senha) => signInWithEmailAndPassword(auth, email, senha);
export const criarConta = (email, senha) => createUserWithEmailAndPassword(auth, email, senha);
export const sair = () => signOut(auth);

export const listarPacientes = async () => comId(await getDocs(colecao('pacientes')));
export const criarPaciente = dados => addDoc(colecao('pacientes'), dados);
export const editarPaciente = (id, dados) => updateDoc(documento('pacientes', id), dados);
export const excluirPaciente = id => deleteDoc(documento('pacientes', id));

export const listarConsultasDoDia = async data =>
  comId(await getDocs(query(colecao('consultas'), where('data', '==', data))));

export const listarConsultasDoPaciente = async pacienteId =>
  comId(await getDocs(query(colecao('consultas'), where('pacienteId', '==', pacienteId))));

// A transação lê o horário e grava em uma única operação, evitando duas marcações simultâneas.
export function salvarConsulta(dados, idAnterior = null) {
  const novoId = idConsulta(dados);
  return runTransaction(db, async transacao => {
    const atual = await transacao.get(documento('consultas', novoId));
    if (novoId !== idAnterior && !horarioLivre(atual.data())) {
      throw Object.assign(new Error('Horário ocupado'), { code: 'horario-ocupado' });
    }
    if (idAnterior && novoId !== idAnterior) transacao.delete(documento('consultas', idAnterior));
    transacao.set(documento('consultas', novoId), dados);
  });
}

export const alterarStatus = (id, status) => updateDoc(documento('consultas', id), { status });
export const excluirConsulta = id => deleteDoc(documento('consultas', id));
