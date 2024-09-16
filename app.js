const express = require('express');
const MobileDetect = require('mobile-detect');
const path = require('path');
const axios = require('axios');
const useragent = require('useragent');
const { format } = require('date-fns');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
require('dotenv').config();  // Carrega as variáveis de ambiente do .env

// CODDING: Modelos
const visitTrackerModel = require('./model/visitTrackerModel');
const configModel = require('./model/configModel');


// CODDING: Função para salvar visitas
function visitTrackerSave({ dataFormatted, data, status, ip, pais, cidade, regiao, provedor, userAgentString, sistemaOperacional, dispositivo, subID, ipapi, referer }) {


    const newVisit = new visitTrackerModel({
        dataFormatted: dataFormatted,
        data: data,
        status: status,
        ip: ip,
        pais: pais,
        cidade: cidade,
        regiao: regiao,
        provedor: provedor,
        userAgent: userAgentString,
        sistemaOperacional: sistemaOperacional,
        dispositivo: dispositivo,
        subID: subID,
        ipapi: ipapi,
        referer: referer ? referer : 'Nenhuma referência'
    });

    newVisit.save()
        .then(() => console.log('Data saved successfully'))
        .catch(err => console.error('Error saving data:', err));
}

const app = express();


// Configurar a pasta 'public' como estática
app.use(express.static(path.join(__dirname, 'public')));

// Configurar EJS como a view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Função para inicializar a configuração do cloaker
async function initializeCloakerConfig() {
    try {
        // Verifica se já existe uma configuração no banco de dados
        const existingConfig = await configModel.findOne();

        if (!existingConfig) {
            // Se não existir, cria uma nova configuração com os valores padrões
            const defaultConfig = new configModel(); // Usa os valores padrão do schema
            await defaultConfig.save();
            console.log('Configuração padrão criada com sucesso.');
        } else {
            console.log('Configuração já existente.');
        }
    } catch (error) {
        console.error('Erro ao inicializar configuração:', error);
    }
}

// CODDING: Conectar no MongoDB
const uri = process.env.MONGODB_URI;
mongoose.connect(uri).then(() => {
    console.log('Conectado ao MongoDB Atlas');
    initializeCloakerConfig();
}).catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));


// Defina a senha de autenticação
const AUTH_PASSWORD = '9487';


// Rota para o dashboard
app.get('/dashboard', async (req, res) => {

    // Obtenha o parâmetro de senha da query string
    const password = req.query.password;

    // Verifique se a senha está correta
    if (password !== AUTH_PASSWORD) {
        return res.status(403).send('Senha incorreta.');
    }

    // Busca a configuração no banco de dados
    const config = await configModel.findOne();

    // Busca todos os registros
    const visits = await visitTrackerModel.find().exec();

    // Calcula as quantidades
    const totalVisits = visits.length;
    const blockedVisits = visits.filter(visit => visit.status.status === false).length;
    const approvedVisits = visits.filter(visit => visit.status.status === true).length;

    res.render('menu', {
        title: 'Dashboard de Acessos',
        body: 'dashboard',
        visitsTacker: visits,
        visitAnalysis: {
            totalVisits: totalVisits,
            blockedVisits: blockedVisits,
            approvedVisits: approvedVisits
        },
        config: config ? config : {}
    });
});

// Rota principal
app.get('/', async (req, res) => {

    // Pega o referer da requisição
    const referer = req.headers.referer || req.headers.referrer;
    console.log('referencia da requisição:', referer);

    // Função de pegar Ip(Internet Protocol)
    function getIp(req) {
        const forwarded = req.headers['x-forwarded-for'];
        console.log(`valor de req.headers['x-forwarded-for']:`,req.headers['x-forwarded-for']);
        console.log(`valor de req.socket.remoteAddress:`, req.socket.remoteAddress);
        return forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    }
    
    // Funções de captura de geolocalização
    async function getGeoData(ip) {
        try {
            const response = await axios.get(`http://ipapi.co/${ip}/json/`);
            return response.data;
        } catch (error) {
            console.error('Erro ao obter geolocalização:', error);
            return null;
        }
    }

    const ip = getIp(req);
    console.log("valor do ip:",ip);
    const geoData = await getGeoData(ip);
    const provider = geoData ? geoData.org : 'Desconhecido';

    const userAgentString = req.headers['user-agent'];
    const mobileDetect = new MobileDetect(userAgentString);
    const dispositivo = mobileDetect.tablet() ? 'Tablet' : mobileDetect.mobile() ? 'Mobile' : 'Desktop';

    // Busca a configuração no banco de dados
    async function validarConfiguracoes() {
        const config = await configModel.findOne();
        let status = { status: true, motivo: "" };

        // IP 
        const userIp = getIp(req);

        // Bloqueio global
        if (config.bloqueioGlobal) {
            status.status = false;
            status.motivo = "bloqueio global ativo";
            return status;
        }

        // Bloquer todos e adicionar IPs na black list
        if (config.tipoBloqueio === "bloquearTodosEAdicionarIpNaBlackList") {
            status.status = false;
            status.motivo = "bloquear todos e adicionar IP na black list";

            // adicionar IP na black list
            if (!config.bloquearIPs.includes(userIp)) {
                // IP não existe, então adiciona
                await configModel.findOneAndUpdate(
                    {}, // Filtro
                    { $addToSet: { bloquearIPs: userIp } }, // Adiciona o IP sem duplicar
                    { new: true } // Retorna o documento atualizado
                );
            } else {
                status.motivo = "IP bloqueado";
            }


            return status;
        }

        // Verificar IPs da black list
        if (config.bloquearIPs.includes(userIp)) {
            status.status = false;
            status.motivo = "IP bloqueado";
            return status;
        }

        // Verificar provedores da black list
        console.log('config.bloquearProvedor:',config.bloquearProvedor);
        if (config.bloquearProvedor.length > 0) {
            const provedorBloqueado = config.bloquearProvedor.some(bloqueado => {
                console.log('valor do provedor:',bloqueado.trim());
                // Remover as aspas da string bloqueada (se houver)
                const isCorrespondenciaAmpla = bloqueado.trim().startsWith('"') && bloqueado.trim().endsWith('"');

                // Correspondência ampla (com aspas)
                if (isCorrespondenciaAmpla) {
                    const provedorPalavra = bloqueado.trim().replace(/"/g, ""); // Remove as aspas
                    return provider.toUpperCase().includes(provedorPalavra.toUpperCase());
                }

                // Correspondência exata (sem aspas)
                console.log(`correspondencia exata: ${bloqueado} === ${provider} --> ${bloqueado.trim() === provider}`);
                return bloqueado.trim() === provider;
            });

            if (provedorBloqueado) {
                status.status = false;
                status.motivo = "Provedor bloqueado";
                return status;
            } 
        }

        if (config.tipoBloqueio === "bloquearTodos") {
            status.status = false;
            status.motivo = "bloquear todos";
            return status;
        }

        if (config.tipoBloqueio === "permitirTodos") {
            status.status = true;
            status.motivo = "permitir todos";
            return status;
        }

        // Bloquear por categoria | Nenhum pais escolhido
        if (config.tipoBloqueio === "bloquearPorCategoria" && config.permitirPaises.length === 0) {
            status.status = false;
            status.motivo = "Nenhum pais permitido";
            return status;
        }

        // Bloquear por categoria | País escolhido
        if (config.tipoBloqueio === "bloquearPorCategoria" && config.permitirPaises.length > 0) {
            // Verificar se algum dos valores de geoData está na lista de países bloqueados
            const paisPermitido = config.permitirPaises.some(pais => {
                return [
                    geoData.country,        // Código do país (ex: "BR")
                    geoData.country_name,   // Nome do país (ex: "Brazil")
                    geoData.country_code,   // Código ISO do país (ex: "BR")
                    geoData.country_code_iso3 // Código ISO3 do país (ex: "BRA")
                ].includes(pais);
            });

            if (paisPermitido) {
                // País está permitido
                if (config.permitirCidades.length === 0 && config.permitirEstados.length === 0) {
                    // verificar dispositivo 
                    if (config.permitirDispositivos.length > 0) {
                        const dispositivoPermitido = config.permitirDispositivos.some(dispositivoPermitido => {
                            return [
                                dispositivo
                            ].includes(dispositivoPermitido);
                        });
                        if (dispositivoPermitido) {
                            status.status = true;
                            status.motivo = `Pais e dispositivo permitido`;
                            return status;
                        } else {
                            status.status = false;
                            status.motivo = `Dispositivo bloqueado`;
                            return status;
                        }
                    } else {
                        status.status = true;
                        status.motivo = `Pais permitido`;
                        return status
                    }
                } else {
                    // verificar estado
                    if (config.permitirEstados.length > 0) {
                        const estadoPermitido = config.permitirEstados.some(estado => {
                            return [
                                geoData.region,        // Nome do estado (ex: "Pernambuco")
                                geoData.region_code,   // Nome do país (ex: "PE")

                            ].includes(estado);
                        });

                        if (estadoPermitido) {
                            // Estado está permitido
                            if (config.permitirCidades.length === 0) {
                                // verificar dispositivo 
                                if (config.permitirDispositivos.length > 0) {
                                    const dispositivoPermitido = config.permitirDispositivos.some(dispositivoPermitido => {
                                        return [
                                            dispositivo
                                        ].includes(dispositivoPermitido);
                                    });
                                    if (dispositivoPermitido) {
                                        status.status = true;
                                        status.motivo = `Pais, Estado e dispositivo permitido`;
                                        return status
                                    } else {
                                        status.status = false;
                                        status.motivo = `Dispositivo bloqueado`;
                                        return status;
                                    }
                                } else {
                                    status.status = true;
                                    status.motivo = `Estado permitido`;
                                    return status
                                }

                            } else {
                                // verificar cidade
                                const cidadePermitida = config.permitirCidades.some(cidade => {
                                    return [
                                        geoData.city,        // Nome da cidade (ex: "São Paulo")


                                    ].includes(cidade);
                                });

                                if (cidadePermitida) {
                                    // verificar dispositivo 
                                    if (config.permitirDispositivos.length > 0) {
                                        const dispositivoPermitido = config.permitirDispositivos.some(dispositivoPermitido => {
                                            return [
                                                dispositivo
                                            ].includes(dispositivoPermitido);
                                        });
                                        if (dispositivoPermitido) {
                                            status.status = true;
                                            status.motivo = `Pais, Estado, Cidade e dispositivo permitido`;
                                            return status
                                        } else {
                                            status.status = false;
                                            status.motivo = `Dispositivo bloqueado`;
                                            return status;
                                        }
                                    } else {
                                        // cidade permitida
                                        status.status = true;
                                        status.motivo = `Cidade permitida`;
                                        return status
                                    }

                                } else {
                                    // cidade bloqueada
                                    status.status = false;
                                    status.motivo = `Cidade bloqueada`;
                                    return status
                                }
                            }
                        } else {
                            status.status = false;
                            status.motivo = `Estado bloquedo`;
                            return status
                        }
                    } else {
                        // verificar cidade
                        const cidadePermitida = config.permitirCidades.some(cidade => {
                            return [
                                geoData.city,        // Nome da cidade (ex: "São Paulo")


                            ].includes(cidade);
                        });

                        if (cidadePermitida) {
                            // verificar dispositivo 
                            if (config.permitirDispositivos.length > 0) {
                                const dispositivoPermitido = config.permitirDispositivos.some(dispositivoPermitido => {
                                    return [
                                        dispositivo
                                    ].includes(dispositivoPermitido);
                                });
                                if (dispositivoPermitido) {
                                    status.status = true;
                                    status.motivo = `Pais, cidade e dispositivo permitido`;
                                    return status
                                } else {
                                    status.status = false;
                                    status.motivo = `Dispositivo bloqueado`;
                                    return status;
                                }
                            } else {
                                // cidade permitida
                                status.status = true;
                                status.motivo = `Cidade permitida`;
                                return status
                            }

                        } else {
                            // cidade permitida
                            status.status = false;
                            status.motivo = `Cidade bloqueada`;
                            return status
                        }
                    }


                }


            } else {

                // País não está permitido
                status.status = false;
                status.motivo = `Pais bloqueado`;
                return status

            }
        }



        return status
    }
    
    let status = await validarConfiguracoes();

    const agent = useragent.parse(userAgentString);
    const os = agent.os.toString();
    const date = new Date();
    // Formate a data no fuso horário de São Paulo (Brasília)
    const formattedDate = moment(date).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss');

    //const formattedDate = format(date, 'dd/MM/yyyy HH:mm:ss');
    const subId = req.query.subid || 'Nenhum sub ID';

    const country = geoData ? geoData.country_name : 'Desconhecido';
    const city = geoData ? geoData.city : 'Desconhecido';
    const region = geoData ? geoData.region : 'Desconhecido';

    const visitData = {
        dataFormatted: formattedDate,
        status: status,
        data: date,
        ip: ip,
        pais: country,
        cidade: city,
        regiao: region,
        provedor: provider,
        userAgentString: userAgentString,
        sistemaOperacional: os,
        dispositivo: dispositivo,
        subID: subId,
        ipapi: geoData ? geoData : {},
        referer: referer ? referer : ''
    };

    visitTrackerSave(visitData);

    if (status.status) {
        // Redireciona para o link de afiliado se status.status for true
        res.redirect('https://app.monetizze.com.br/r/ABN24740337');
    } else {
        // Renderiza a página 'public01/index' se status.status for false
        res.render('public01/index');
    }
    //res.sendFile(path.join(__dirname, 'public', status.status ? 'black.html' : 'pasta01/index.ejs'));
});


// Função para manter o servidor ativo
function keepServerAlive() {
    setInterval(async () => {
        try {
            await axios.get('https://google.com');
            console.log('Ping para https://google.com realizado com sucesso.');
        } catch (error) {
            console.error('Erro ao realizar o ping para https://google.com:', error.message);
        }
    }, 30000); // Ping a cada 30 segundos
}

// Inicializa o servidor na porta 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    keepServerAlive();
});
