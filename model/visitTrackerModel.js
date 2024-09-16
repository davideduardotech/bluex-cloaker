// DataModel.js
const mongoose = require('mongoose');

const visitTrackerSchema = new mongoose.Schema({
    dataFormatted: { type: String, required: true },
    data: { type: Date, required: true },
    status: {type: Object, required: true},
    ip: { type: String, required: true },
    pais: { type: String, required: true },
    cidade: { type: String, required: true },
    regiao: { type: String, required: true },
    provedor: { type: String, required: true },
    userAgent: { type: String, required: true },
    sistemaOperacional: { type: String, required: true },
    dispositivo: { type: String, required: true },
    subID: { type: String, required: false, default: "Nenhum sub ID"},
    ipapi: { type: Object, required: false, default: {}},
    referer: {type: String, required: false, default: "Nenhuma referência"}
});

const visitTrackerModel = mongoose.model('visitTracker', visitTrackerSchema);

module.exports = visitTrackerModel;
