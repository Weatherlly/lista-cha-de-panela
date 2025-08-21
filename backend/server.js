const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const IP = process.env.IP || '0.0.0.0';
const PORT = process.env.PORT || 5000;

// Middleware com CORS configurado corretamente
app.use(cors({
    origin: '*',  // Permite todas as origens
    credentials: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Validação de nome
function isValidName(name) {
    return typeof name === 'string' && 
           name.trim().length >= 2 && 
           name.trim().length <= 50 &&
           /^[a-zA-ZÀ-ÿ\s']+$/.test(name);
}

// Caminhos para os arquivos JSON
const PRESENTES_FILE = path.join(__dirname, 'presentes.json');
const PESSOAS_FILE = path.join(__dirname, 'pessoas.json');

// Função auxiliar para ler arquivos JSON
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erro ao ler o arquivo ${filePath}:`, error);
        // Retorna array vazio se arquivo não existe
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Função auxiliar para escrever em arquivos JSON
async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Erro ao escrever no arquivo ${filePath}:`, error);
        return false;
    }
}

// Rota para obter a lista de presentes
app.get('/api/presentes', async (req, res) => {
    try {
        const presentes = await readJsonFile(PRESENTES_FILE);
        res.json(presentes);
    } catch (error) {
        console.error('Erro ao carregar presentes:', error);
        res.status(500).json({ error: 'Erro ao carregar lista de presentes' });
    }
});

// Rota para reservar um presente
app.post('/api/reservar', async (req, res) => {
    try {
        const { idPresente, nomeUsuario } = req.body;
        
        // Validação robusta
        if (!idPresente || !nomeUsuario) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do presente e nome do usuário são obrigatórios' 
            });
        }
        
        if (!isValidName(nomeUsuario)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nome inválido' 
            });
        }

        // Normalizar nome (remover espaços extras)
        const nomeNormalizado = nomeUsuario.trim().replace(/\s+/g, ' ');
        
        // Ler os arquivos
        const [presentes, pessoas] = await Promise.all([
            readJsonFile(PRESENTES_FILE),
            readJsonFile(PESSOAS_FILE)
        ]);
        
        // Encontrar o presente
        const presenteIndex = presentes.findIndex(p => p.id === idPresente);
        
        if (presenteIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Presente não encontrado' 
            });
        }
        
        // Verificar se já está reservado
        if (presentes[presenteIndex].reservado) {
            return res.json({ 
                success: false, 
                message: 'Este presente já foi reservado' 
            });
        }
        
        // Verificar se o usuário já reservou algum presente
        // const usuarioJaReservou = pessoas.some(p => 
        //     p.nome.toLowerCase() === nomeNormalizado.toLowerCase()
        // );
        
        // if (usuarioJaReservou) {
        //     return res.json({ 
        //         success: false, 
        //         message: 'Você já reservou um presente' 
        //     });
        // }
        
        // Atualizar o presente
        presentes[presenteIndex].reservado = true;
        presentes[presenteIndex].reservadoPor = nomeNormalizado;
        presentes[presenteIndex].dataReserva = new Date().toISOString();
        
        // Adicionar à lista de pessoas
        pessoas.push({
            id: Date.now().toString(),
            nome: nomeNormalizado,
            presenteId: idPresente,
            presenteNome: presentes[presenteIndex].nome,
            dataReserva: new Date().toISOString()
        });
        
        // Salvar as alterações
        const [presentesSalvos, pessoasSalvas] = await Promise.all([
            writeJsonFile(PRESENTES_FILE, presentes),
            writeJsonFile(PESSOAS_FILE, pessoas)
        ]);
        
        if (presentesSalvos && pessoasSalvas) {
            res.json({ 
                success: true, 
                message: 'Presente reservado com sucesso',
                presente: presentes[presenteIndex]
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao salvar reserva' 
            });
        }
        
    } catch (error) {
        console.error('Erro ao processar reserva:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Rota para cancelar reserva - VERSÃO CORRIGIDA
app.post('/api/cancelar-reserva', async (req, res) => {
    try {
        const { nomeUsuario, presenteId } = req.body; // Adicionar presenteId
        
        if (!isValidName(nomeUsuario)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nome inválido' 
            });
        }

        const nomeNormalizado = nomeUsuario.trim().replace(/\s+/g, ' ');
        
        const [presentes, pessoas] = await Promise.all([
            readJsonFile(PRESENTES_FILE),
            readJsonFile(PESSOAS_FILE)
        ]);
        
        // Encontrar a pessoa E o presente específico
        const pessoaIndex = pessoas.findIndex(p => 
            p.nome.toLowerCase() === nomeNormalizado.toLowerCase() && 
            p.presenteId === presenteId // Verificar o presente específico
        );
        
        if (pessoaIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nenhuma reserva encontrada para este nome e presente' 
            });
        }
        
        const presenteIdEncontrado = pessoas[pessoaIndex].presenteId;
        
        // Encontrar e atualizar o presente
        const presenteIndex = presentes.findIndex(p => p.id === presenteIdEncontrado);
        if (presenteIndex !== -1) {
            presentes[presenteIndex].reservado = false;
            delete presentes[presenteIndex].reservadoPor;
            delete presentes[presenteIndex].dataReserva;
        }
        
        // Remover a pessoa
        pessoas.splice(pessoaIndex, 1);
        
        // Salvar as alterações
        const [presentesSalvos, pessoasSalvas] = await Promise.all([
            writeJsonFile(PRESENTES_FILE, presentes),
            writeJsonFile(PESSOAS_FILE, pessoas)
        ]);
        
        if (presentesSalvos && pessoasSalvas) {
            res.json({ 
                success: true, 
                message: 'Reserva cancelada com sucesso' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao cancelar reserva' 
            });
        }
        
    } catch (error) {
        console.error('Erro ao cancelar reserva:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Rota para obter a lista de pessoas e seus presentes
app.get('/api/pessoas', async (req, res) => {
    try {
        const pessoas = await readJsonFile(PESSOAS_FILE);
        res.json(pessoas);
    } catch (error) {
        console.error('Erro ao carregar pessoas:', error);
        res.status(500).json({ error: 'Erro ao carregar lista de pessoas' });
    }
});

// Rota de saúde do servidor
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware de erro
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
    });
});

// Rota para página não encontrada
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Iniciar servidor
app.listen(PORT, IP, () => {
    console.log(`Servidor rodando em http://${IP}:${PORT}`);
});
