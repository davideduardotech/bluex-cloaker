const mongoose = require('mongoose');

const cloakerConfigSchema = new mongoose.Schema({
  tipoBloqueio: {
    type: String,
    enum: ['bloquearTodos','bloquearTodosEAdicionarIpNaBlackList', 'permitirTodos', 'bloquearPorCategoria'],
    required: false,
    default: "bloquearTodos"
  },
  bloquearPaises: {
    type: [String], // Lista de países para bloquear
    default: []
  },
  permitirPaises: {
    type: [String], // Lista de países permitidos, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    default: []
  },
  permitirCidades: {
    type: [String], // Lista de cidades permitidas, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    default: []
  },
  permitirEstados: {
    type: [String], // Lista de estados permitidos, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    default: []
  },
  bloquearDispositivos: {
    type: [String], // Lista de dispositivos para bloquear
    enum: ['Mobile', 'Tablet', 'Desktop'],
    default: []
  },
  permitirDispositivos: {
    type: [String], // Lista de dispositivos permitidos, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    enum: ['Mobile', 'Tablet', 'Desktop'],
    default: []
  },
  bloquearIPs: {
    type: [String], // Lista de IPs para bloquear
    default: []
  },
  permitirIPs: {
    type: [String], // Lista de IPs permitidos, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    default: []
  },
  bloquearUserAgents: {
    type: [String], // Lista de user agents para bloquear
    default: []
  },
  permitirUserAgents: {
    type: [String], // Lista de user agents permitidos, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    default: []
  },
  bloquearSistemasOperacionais: {
    type: [String], // Lista de sistemas operacionais para bloquear
    default: []
  },
  permitirSistemasOperacionais: {
    type: [String], // Lista de sistemas operacionais permitidos, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    default: []
  },
  bloquearReferers: {
    type: [String], // Lista de referers para bloquear
    default: []
  },
  permitirReferers: {
    type: [String], // Lista de referers permitidos, usados se 'tipoBloqueio' for 'bloquearPorCategoria'
    default: []
  },
  bloquearProvedor: {
    type: [String], // Lista de referers para bloquear
    default: []
  },
  bloqueioGlobal: {
    type: Boolean, // Se o bloqueio global está ativado
    default: false
  }
}, { timestamps: true });

const CloakerConfig = mongoose.model('CloakerConfig', cloakerConfigSchema);

module.exports = CloakerConfig;
