/**
 * ============================================
 * SISTEMA PGR PROFISSIONAL
 * Programa de Gerenciamento de Riscos
 * ============================================
 * 
 * @version 2.0
 * @author Engenharia de Segurança do Trabalho
 * @description Sistema completo para gestão de riscos ocupacionais
 *              conforme NR-01 e NR-18
 */

'use strict';

// ============================================
// CONFIGURAÇÕES GLOBAIS E CONSTANTES
// ============================================

const CONFIG = {
    VERSION: '2.0',
    STORAGE_KEY: 'pgr_dados',
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// Matrizes de Avaliação de Riscos
const MATRIZ_PROBABILIDADE = {
    'Baixa': 1,
    'Média': 2,
    'Alta': 3
};

const MATRIZ_SEVERIDADE = {
    'Leve': 1,
    'Moderada': 2,
    'Grave': 3,
    'Fatal': 4
};

// Classificação de Riscos por Valor
const CLASSIFICACAO_RISCO = {
    1: { nivel: 'Baixo', classe: 'baixo', cor: '#10b981' },
    2: { nivel: 'Baixo', classe: 'baixo', cor: '#10b981' },
    3: { nivel: 'Médio', classe: 'medio', cor: '#f59e0b' },
    4: { nivel: 'Médio', classe: 'medio', cor: '#f59e0b' },
    6: { nivel: 'Médio', classe: 'medio', cor: '#f59e0b' },
    8: { nivel: 'Alto', classe: 'alto', cor: '#ef4444' },
    9: { nivel: 'Alto', classe: 'alto', cor: '#ef4444' },
    12: { nivel: 'Alto', classe: 'alto', cor: '#ef4444' }
};

// ============================================
// ESTADO DA APLICAÇÃO
// ============================================

const ESTADO = {
    riscos: [],
    contadorRiscos: 0,
    planoAcaoGerado: false,
    dadosModificados: false
};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log(`Sistema PGR v${CONFIG.VERSION} inicializado`);
    
    inicializarSistema();
    configurarEventos();
    aplicarMascaras();
    definirDataAtual();
    adicionarRiscoExemplo();
    carregarDadosSalvos();
});

/**
 * Inicializa o sistema
 */
function inicializarSistema() {
    console.log('Inicializando sistema...');
    
    // Verificar suporte a localStorage
    if (!verificarSuporteLocalStorage()) {
        console.warn('localStorage não disponível');
    }
    
    // Atualizar estatísticas iniciais
    atualizarEstatisticas();
}

/**
 * Configura todos os event listeners
 */
function configurarEventos() {
    // Botões principais
    document.getElementById('btnAdicionarRisco').addEventListener('click', adicionarNovoRisco);
    document.getElementById('btnGerarPlanoAcao').addEventListener('click', gerarPlanoAcao);
    document.getElementById('btnGerarPDF').addEventListener('click', gerarPDF);
    document.getElementById('btnSalvarDados').addEventListener('click', salvarDadosLocal);
    document.getElementById('btnCarregarDados').addEventListener('click', carregarDadosLocal);
    document.getElementById('btnVisualizarPrevia').addEventListener('click', visualizarPrevia);
    document.getElementById('btnExportarDados').addEventListener('click', exportarJSON);
    
    // Atualizar assinatura em tempo real
    const camposAssinatura = ['nomeResponsavel', 'creaResponsavel', 'artResponsavel', 'dataElaboracao'];
    camposAssinatura.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('input', atualizarAssinatura);
        }
    });
    
    // Marcar dados como modificados ao editar campos
    document.querySelectorAll('input, textarea, select').forEach(elemento => {
        elemento.addEventListener('change', () => {
            ESTADO.dadosModificados = true;
        });
    });
    
    // Aviso ao sair com dados não salvos
    window.addEventListener('beforeunload', function(e) {
        if (ESTADO.dadosModificados) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

/**
 * Aplica máscaras de formatação
 */
function aplicarMascaras() {
    // Máscara CNPJ
    const cnpjInput = document.getElementById('cnpj');
    if (cnpjInput) {
        cnpjInput.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length <= 14) {
                valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
                valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
                valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
                e.target.value = valor;
            }
        });
    }
    
    // Máscara CNAE
    const cnaeInput = document.getElementById('cnae');
    if (cnaeInput) {
        cnaeInput.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length <= 7) {
                valor = valor.replace(/^(\d{4})(\d)/, '$1-$2');
                valor = valor.replace(/(\d{1})(\d{2})$/, '$1/$2');
                e.target.value = valor;
            }
        });
    }
}

/**
 * Define data atual
 */
function definirDataAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataElaboracao').value = hoje;
    atualizarHistoricoRevisao();
    atualizarAssinatura();
}

// ============================================
// GERENCIAMENTO DE RISCOS
// ============================================

/**
 * Adiciona risco de exemplo
 */
function adicionarRiscoExemplo() {
    const riscoExemplo = {
        id: ++ESTADO.contadorRiscos,
        atividade: 'Trabalho em Altura - Montagem de Estruturas Metálicas',
        perigo: 'Queda de diferença de nível superior a 2,00m',
        tipoRisco: 'Acidente',
        fonte: 'Execução de atividades em andaimes, plataformas elevadas e estruturas sem proteção coletiva adequada conforme NR-35',
        consequencias: 'Lesões graves, fraturas múltiplas, trauma cranioencefálico, lesões de coluna vertebral, risco de óbito',
        probabilidade: 'Alta',
        severidade: 'Fatal',
        foto: null
    };
    
    ESTADO.riscos.push(riscoExemplo);
    renderizarRisco(riscoExemplo);
    atualizarEstatisticas();
}

/**
 * Adiciona novo risco em branco
 */
function adicionarNovoRisco() {
    const novoRisco = {
        id: ++ESTADO.contadorRiscos,
        atividade: '',
        perigo: '',
        tipoRisco: 'Acidente',
        fonte: '',
        consequencias: '',
        probabilidade: 'Média',
        severidade: 'Moderada',
        foto: null
    };
    
    ESTADO.riscos.push(novoRisco);
    renderizarRisco(novoRisco);
    atualizarEstatisticas();
    
    // Scroll até o novo risco
    setTimeout(() => {
        const linha = document.querySelector(`tr[data-risco-id="${novoRisco.id}"]`);
        if (linha) {
            linha.scrollIntoView({ behavior: 'smooth', block: 'center' });
            linha.querySelector('textarea').focus();
        }
    }, 100);
    
    ESTADO.dadosModificados = true;
}

/**
 * Renderiza um risco na tabela
 */
function renderizarRisco(risco) {
    const tbody = document.getElementById('corpoInventarioRiscos');
    const tr = document.createElement('tr');
    tr.setAttribute('data-risco-id', risco.id);
    
    // Calcular nível de risco
    const valorRisco = MATRIZ_PROBABILIDADE[risco.probabilidade] * MATRIZ_SEVERIDADE[risco.severidade];
    const classificacao = CLASSIFICACAO_RISCO[valorRisco];
    
    tr.innerHTML = `
        <td>
            <textarea class="campo-atividade" rows="3" 
                placeholder="Ex: Carpintaria, Armação de estruturas, Concretagem, Alvenaria...">${risco.atividade}</textarea>
        </td>
        <td>
            <textarea class="campo-perigo" rows="3" 
                placeholder="Ex: Queda de altura, Choque elétrico, Projeção de partículas...">${risco.perigo}</textarea>
        </td>
        <td>
            <select class="campo-tipo-risco">
                <option value="Acidente" ${risco.tipoRisco === 'Acidente' ? 'selected' : ''}>Acidente</option>
                <option value="Físico" ${risco.tipoRisco === 'Físico' ? 'selected' : ''}>Físico</option>
                <option value="Químico" ${risco.tipoRisco === 'Químico' ? 'selected' : ''}>Químico</option>
                <option value="Biológico" ${risco.tipoRisco === 'Biológico' ? 'selected' : ''}>Biológico</option>
                <option value="Ergonômico" ${risco.tipoRisco === 'Ergonômico' ? 'selected' : ''}>Ergonômico</option>
            </select>
        </td>
        <td>
            <textarea class="campo-fonte" rows="3" 
                placeholder="Descreva detalhadamente a fonte geradora do risco ou situação de exposição...">${risco.fonte}</textarea>
        </td>
        <td>
            <textarea class="campo-consequencias" rows="3" 
                placeholder="Descreva os possíveis danos à saúde e integridade física dos trabalhadores...">${risco.consequencias}</textarea>
        </td>
        <td>
            <select class="campo-probabilidade">
                <option value="Baixa" ${risco.probabilidade === 'Baixa' ? 'selected' : ''}>Baixa</option>
                <option value="Média" ${risco.probabilidade === 'Média' ? 'selected' : ''}>Média</option>
                <option value="Alta" ${risco.probabilidade === 'Alta' ? 'selected' : ''}>Alta</option>
            </select>
        </td>
        <td>
            <select class="campo-severidade">
                <option value="Leve" ${risco.severidade === 'Leve' ? 'selected' : ''}>Leve</option>
                <option value="Moderada" ${risco.severidade === 'Moderada' ? 'selected' : ''}>Moderada</option>
                <option value="Grave" ${risco.severidade === 'Grave' ? 'selected' : ''}>Grave</option>
                <option value="Fatal" ${risco.severidade === 'Fatal' ? 'selected' : ''}>Fatal</option>
            </select>
        </td>
        <td class="nivel-risco-celula">
            <span class="nivel-risco-badge ${classificacao.classe}">${classificacao.nivel}</span>
        </td>
        <td>
            <div class="foto-upload-wrapper">
                <input type="file" id="foto-${risco.id}" accept="image/*" style="display: none;">
                <label for="foto-${risco.id}" class="foto-upload-label">
                    📷 Anexar Foto
                </label>
                <div id="preview-${risco.id}"></div>
            </div>
        </td>
        <td>
            <button class="btn btn-danger" onclick="removerRisco(${risco.id})" title="Excluir este risco">
                🗑️ Excluir
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    // Event listeners para recálculo
    const selectProb = tr.querySelector('.campo-probabilidade');
    const selectSev = tr.querySelector('.campo-severidade');
    
    selectProb.addEventListener('change', () => {
        recalcularNivelRisco(risco.id, tr);
        atualizarEstatisticas();
        ESTADO.dadosModificados = true;
    });
    
    selectSev.addEventListener('change', () => {
        recalcularNivelRisco(risco.id, tr);
        atualizarEstatisticas();
        ESTADO.dadosModificados = true;
    });
    
    // Event listener para upload de foto
    const inputFoto = document.getElementById(`foto-${risco.id}`);
    inputFoto.addEventListener('change', (e) => uploadFoto(e, risco.id));
    
    // Event listeners para salvar alterações
    tr.querySelectorAll('textarea, select').forEach(campo => {
        campo.addEventListener('change', () => {
            salvarAlteracoesRisco(risco.id, tr);
            ESTADO.dadosModificados = true;
        });
    });
}

/**
 * Recalcula nível de risco
 */
function recalcularNivelRisco(riscoId, tr) {
    const probabilidade = tr.querySelector('.campo-probabilidade').value;
    const severidade = tr.querySelector('.campo-severidade').value;
    
    const valorRisco = MATRIZ_PROBABILIDADE[probabilidade] * MATRIZ_SEVERIDADE[severidade];
    const classificacao = CLASSIFICACAO_RISCO[valorRisco];
    
    const celulaNivel = tr.querySelector('.nivel-risco-celula');
    celulaNivel.innerHTML = `<span class="nivel-risco-badge ${classificacao.classe}">${classificacao.nivel}</span>`;
    
    // Atualizar no array
    const risco = ESTADO.riscos.find(r => r.id === riscoId);
    if (risco) {
        risco.probabilidade = probabilidade;
        risco.severidade = severidade;
    }
}

/**
 * Salva alterações de um risco
 */
function salvarAlteracoesRisco(riscoId, tr) {
    const risco = ESTADO.riscos.find(r => r.id === riscoId);
    if (!risco) return;
    
    risco.atividade = tr.querySelector('.campo-atividade').value;
    risco.perigo = tr.querySelector('.campo-perigo').value;
    risco.tipoRisco = tr.querySelector('.campo-tipo-risco').value;
    risco.fonte = tr.querySelector('.campo-fonte').value;
    risco.consequencias = tr.querySelector('.campo-consequencias').value;
    risco.probabilidade = tr.querySelector('.campo-probabilidade').value;
    risco.severidade = tr.querySelector('.campo-severidade').value;
}

/**
 * Remove um risco
 */
function removerRisco(riscoId) {
    if (!confirm('Tem certeza que deseja excluir este risco?\n\nEsta ação não pode ser desfeita.')) {
        return;
    }
    
    // Remover do array
    ESTADO.riscos = ESTADO.riscos.filter(r => r.id !== riscoId);
    
    // Remover da tabela
    const tr = document.querySelector(`tr[data-risco-id="${riscoId}"]`);
    if (tr) {
        tr.remove();
    }
    
    atualizarEstatisticas();
    ESTADO.dadosModificados = true;
    ESTADO.planoAcaoGerado = false;
}

/**
 * Upload de foto
 */
function uploadFoto(event, riscoId) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    
    // Validações
    if (!CONFIG.ACCEPTED_IMAGE_TYPES.includes(arquivo.type)) {
        alert('Formato de arquivo não suportado.\n\nApenas imagens JPEG, PNG e WebP são aceitas.');
        event.target.value = '';
        return;
    }
    
    if (arquivo.size > CONFIG.MAX_FILE_SIZE) {
        alert(`Arquivo muito grande.\n\nTamanho máximo: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
        event.target.value = '';
        return;
    }
    
    // Ler arquivo
    const reader = new FileReader();
    reader.onload = function(e) {
        const risco = ESTADO.riscos.find(r => r.id === riscoId);
        if (risco) {
            risco.foto = e.target.result;
        }
        
        // Mostrar preview
        const previewDiv = document.getElementById(`preview-${riscoId}`);
        previewDiv.innerHTML = `
            <img src="${e.target.result}" 
                 alt="Evidência Fotográfica" 
                 class="foto-preview-img" 
                 onclick="ampliarFoto('${e.target.result}')">
            <span class="foto-status">✓ Anexada</span>
        `;
        
        ESTADO.dadosModificados = true;
    };
    
    reader.readAsDataURL(arquivo);
}

/**
 * Amplia foto em modal
 */
function ampliarFoto(src) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = () => modal.remove();
    
    const img = document.createElement('img');
    img.src = src;
    img.className = 'modal-image';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
}

/**
 * Atualiza estatísticas de riscos
 */
function atualizarEstatisticas() {
    // Sincronizar dados dos riscos
    ESTADO.riscos.forEach(risco => {
        const tr = document.querySelector(`tr[data-risco-id="${risco.id}"]`);
        if (tr) {
            salvarAlteracoesRisco(risco.id, tr);
        }
    });
    
    let totalAlto = 0;
    let totalMedio = 0;
    let totalBaixo = 0;
    
    ESTADO.riscos.forEach(risco => {
        const valor = MATRIZ_PROBABILIDADE[risco.probabilidade] * MATRIZ_SEVERIDADE[risco.severidade];
        const classificacao = CLASSIFICACAO_RISCO[valor];
        
        if (classificacao.nivel === 'Alto') totalAlto++;
        else if (classificacao.nivel === 'Médio') totalMedio++;
        else totalBaixo++;
    });
    
    document.getElementById('totalRiscos').textContent = ESTADO.riscos.length;
    document.getElementById('riscosAltos').textContent = totalAlto;
    document.getElementById('riscosMedios').textContent = totalMedio;
    document.getElementById('riscosBaixos').textContent = totalBaixo;
}

// ============================================
// PLANO DE AÇÃO
// ============================================

/**
 * Gera plano de ação automaticamente
 */
function gerarPlanoAcao() {
    if (ESTADO.riscos.length === 0) {
        alert('Não há riscos cadastrados.\n\nAdicione pelo menos um risco ao inventário antes de gerar o plano de ação.');
        return;
    }
    
    if (ESTADO.planoAcaoGerado) {
        if (!confirm('O plano de ação já foi gerado.\n\nDeseja gerar novamente? As alterações manuais serão perdidas.')) {
            return;
        }
    }
    
    const tbody = document.getElementById('corpoPlanoAcao');
    tbody.innerHTML = '';
    
    // Atualizar dados dos riscos
    ESTADO.riscos.forEach(risco => {
        const tr = document.querySelector(`tr[data-risco-id="${risco.id}"]`);
        if (tr) {
            salvarAlteracoesRisco(risco.id, tr);
        }
    });
    
    // Ordenar por nível de risco (Alto > Médio > Baixo)
    const riscosOrdenados = [...ESTADO.riscos].sort((a, b) => {
        const valorA = MATRIZ_PROBABILIDADE[a.probabilidade] * MATRIZ_SEVERIDADE[a.severidade];
        const valorB = MATRIZ_PROBABILIDADE[b.probabilidade] * MATRIZ_SEVERIDADE[b.severidade];
        return valorB - valorA;
    });
    
    // Gerar ações para cada risco
    riscosOrdenados.forEach(risco => {
        const valor = MATRIZ_PROBABILIDADE[risco.probabilidade] * MATRIZ_SEVERIDADE[risco.severidade];
        const classificacao = CLASSIFICACAO_RISCO[valor];
        const acao = gerarAcaoParaRisco(risco, classificacao);
        renderizarAcao(acao);
    });
    
    ESTADO.planoAcaoGerado = true;
    
    // Scroll até o plano
    document.getElementById('tabelaPlanoAcao').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Feedback
    mostrarNotificacao('Plano de ação gerado com sucesso!', 'success');
}

/**
 * Gera ação para um risco específico
 */
function gerarAcaoParaRisco(risco, classificacao) {
    let medida = '';
    let prioridade = '';
    let prazo = '';
    
    if (classificacao.nivel === 'Alto') {
        prioridade = 'Imediata';
        prazo = '24-48 horas';
        medida = gerarMedidasPrioritarias(risco);
    } else if (classificacao.nivel === 'Médio') {
        prioridade = 'Urgente';
        prazo = '7-15 dias corridos';
        medida = gerarMedidasProgramadas(risco);
    } else {
        prioridade = 'Programada';
        prazo = '30-60 dias corridos';
        medida = gerarMedidasMonitoramento(risco);
    }
    
    return {
        risco: `${risco.atividade} - ${risco.perigo}`,
        medida: medida,
        prioridade: prioridade,
        responsavel: 'Engenheiro de Segurança do Trabalho / Equipe de SST',
        prazo: prazo,
        status: 'Pendente'
    };
}

/**
 * Gera medidas prioritárias (risco alto)
 */
function gerarMedidasPrioritarias(risco) {
    const medidas = {
        'Acidente': `AÇÃO IMEDIATA REQUERIDA: 1) Avaliar necessidade de PARALISAÇÃO IMEDIATA da atividade até implementação de controles adequados (NR-01, item 1.4.1); 2) Implementar proteção coletiva prioritária (guarda-corpo rígido, sistemas de ancoragem, plataformas de proteção conforme NR-18); 3) Realizar Análise Preliminar de Riscos (APR) com participação dos trabalhadores envolvidos; 4) Ministrar Diálogo Diário de Segurança (DDS) específico sobre o risco identificado; 5) Disponibilizar EPIs adequados com Certificado de Aprovação (CA) válido e treinamento de uso correto; 6) Garantir capacitação técnica conforme NR aplicável (ex: NR-35 para trabalho em altura); 7) Designar supervisor de segurança para acompanhamento contínuo da atividade; 8) Estabelecer procedimento operacional padrão (POP) detalhado; 9) Implementar sistema de permissão de trabalho (PT); 10) Documentar todas as medidas implementadas para fins de comprovação pericial.`,
        
        'Físico': `CONTROLE IMEDIATO NECESSÁRIO: 1) Isolar completamente a fonte geradora do agente físico (${risco.fonte}); 2) Implementar controles de engenharia (enclausuramento, barreiras acústicas, isolamento térmico) conforme aplicável; 3) Realizar avaliação quantitativa ambiental imediata por profissional habilitado com equipamentos calibrados; 4) Estabelecer sistema de rodízio de pessoal para minimização do tempo de exposição; 5) Fornecer EPIs adequados ao agente (protetores auriculares tipo concha ou inserção, vestimentas aluminizadas, etc.) com CA válido; 6) Implementar programa de monitoramento contínuo das condições ambientais; 7) Submeter trabalhadores expostos a exames médicos ocupacionais específicos (audiometria, espirometria, etc.); 8) Sinalizar adequadamente áreas de risco; 9) Elaborar relatório técnico de avaliação ambiental; 10) Revisar PPRA/PGR com as novas condições identificadas.`,
        
        'Químico': `MEDIDAS EMERGENCIAIS: 1) Avaliar possibilidade de SUBSTITUIÇÃO do produto químico por alternativa menos tóxica ou nociva (prioridade máxima na hierarquia de controles); 2) Se inviável a substituição, implementar sistema de ventilação local exaustora (VLE) dimensionado tecnicamente; 3) Armazenar produtos em local ventilado, sinalizado e com contenção de vazamentos; 4) Disponibilizar Ficha de Informações de Segurança de Produtos Químicos (FISPQ) em local visível e acessível; 5) Fornecer EPIs específicos: proteção respiratória com filtro químico adequado (verificar CA e tipo de filtro), luvas de proteção química, óculos de segurança, vestimentas impermeáveis; 6) Realizar treinamento obrigatório sobre manuseio seguro de produtos químicos; 7) Implementar procedimentos de emergência para derramamentos e exposições; 8) Providenciar chuveiro de emergência e lava-olhos quando aplicável; 9) Estabelecer procedimentos rigorosos de higiene ocupacional; 10) Realizar monitoramento biológico dos trabalhadores expostos conforme NR-07.`,
        
        'Biológico': `CONTROLE BIOSSANITÁRIO URGENTE: 1) Avaliar eliminação completa da fonte de exposição ao agente biológico; 2) Implementar barreiras físicas de isolamento e contenção; 3) Estabelecer protocolos rigorosos de higiene e assepsia; 4) Fornecer EPIs de biossegurança adequados (máscaras N95/PFF2, luvas, aventais, óculos de proteção); 5) Disponibilizar instalações sanitárias adequadas com água potável, sabão e papel toalha; 6) Implementar vacinação profilática quando existente e indicada; 7) Estabelecer procedimentos para descarte adequado de resíduos biológicos conforme normas ANVISA/CONAMA; 8) Ministrar treinamento sobre riscos biológicos e medidas preventivas; 9) Implementar controle médico rigoroso com exames laboratoriais periódicos; 10) Providenciar local apropriado para refeições, separado das áreas de risco.`,
        
        'Ergonômico': `INTERVENÇÃO ERGONÔMICA PRIORITÁRIA: 1) Realizar Análise Ergonômica do Trabalho (AET) completa conforme NR-17, conduzida por profissional especializado; 2) Adequar imediatamente mobiliário, bancadas e postos de trabalho às dimensões antropométricas dos trabalhadores; 3) Implementar ferramentas ergonômicas e dispositivos auxiliares para redução de sobrecarga física; 4) Estabelecer pausas regulares e obrigatórias durante a jornada (mínimo 10 minutos a cada 50 minutos de trabalho repetitivo); 5) Implantar programa de ginástica laboral preparatória e compensatória; 6) Realizar rodízio de tarefas para evitar sobrecarga de grupos musculares específicos; 7) Providenciar treinamento postural e técnicas de movimentação manual de cargas; 8) Ajustar iluminação, temperatura e ventilação conforme parâmetros da NR-17; 9) Reduzir ritmo de trabalho quando identificado como causador de sobrecarga; 10) Acompanhamento médico ocupacional específico para distúrbios osteomusculares.`
    };
    
    return medidas[risco.tipoRisco] || `AÇÃO IMEDIATA: Implementar controles seguindo hierarquia da NR-01 (eliminação, substituição, controles de engenharia, controles administrativos, EPI). Realizar ART específica para intervenção técnica em ${risco.atividade}. Documentar integralmente todas as medidas implementadas.`;
}

/**
 * Gera medidas programadas (risco médio)
 */
function gerarMedidasProgramadas(risco) {
    return `AÇÃO PROGRAMADA: 1) Revisar e atualizar Procedimento Operacional Padrão (POP) específico para ${risco.atividade}, incorporando melhores práticas de segurança; 2) Intensificar programa de treinamento e capacitação dos trabalhadores, com reciclagem periódica; 3) Implementar sinalização de segurança adequada e visível conforme NR-26; 4) Realizar inspeções periódicas programadas (semanal ou quinzenal) nas atividades e equipamentos envolvidos; 5) Verificar sistematicamente a adequação, disponibilidade e estado de conservação dos EPIs; 6) Implementar supervisão técnica contínua durante execução das atividades de risco; 7) Estabelecer sistema de registro de não-conformidades e incidentes; 8) Realizar reuniões periódicas da CIPA/equipe de SST para discussão do risco; 9) Avaliar tecnicamente a viabilidade de controles de engenharia adicionais; 10) Manter documentação atualizada e disponível para fiscalização.`;
}

/**
 * Gera medidas de monitoramento (risco baixo)
 */
function gerarMedidasMonitoramento(risco) {
    return `MONITORAMENTO CONTÍNUO: 1) Manter programa de monitoramento sistemático das condições de ${risco.atividade}; 2) Realizar inspeções periódicas mensais para verificação da manutenção das condições seguras; 3) Executar manutenção preventiva regular de equipamentos, ferramentas e dispositivos de segurança; 4) Reforçar orientações de segurança em Diálogos Diários de Segurança (DDS); 5) Manter registro atualizado de treinamentos e capacitações; 6) Documentar adequadamente todas as atividades e inspeções realizadas; 7) Revisar periodicamente (semestral) a avaliação de risco considerando mudanças em processos ou tecnologias; 8) Manter canal de comunicação aberto para reporte de condições inseguras pelos trabalhadores; 9) Garantir disponibilidade permanente de EPIs adequados; 10) Integrar o monitoramento deste risco nas rotinas da equipe de SST e supervisão operacional.`;
}

/**
 * Renderiza ação no plano
 */
function renderizarAcao(acao) {
    const tbody = document.getElementById('corpoPlanoAcao');
    const tr = document.createElement('tr');
    
    let classePrioridade = '';
    if (acao.prioridade === 'Imediata') classePrioridade = 'prioridade-imediata';
    else if (acao.prioridade === 'Urgente') classePrioridade = 'prioridade-urgente';
    else if (acao.prioridade === 'Programada') classePrioridade = 'prioridade-programada';
    else classePrioridade = 'prioridade-monitoramento';
    
    tr.innerHTML = `
        <td><strong>${acao.risco}</strong></td>
        <td style="text-align: justify; line-height: 1.7;">${acao.medida}</td>
        <td><span class="prioridade-badge ${classePrioridade}">${acao.prioridade}</span></td>
        <td><input type="text" value="${acao.responsavel}" class="form-control"></td>
        <td><input type="text" value="${acao.prazo}" class="form-control"></td>
        <td>
            <select class="form-control">
                <option value="Pendente" selected>Pendente</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
            </select>
        </td>
    `;
    
    tbody.appendChild(tr);
}

// ============================================
// ASSINATURA E HISTÓRICO
// ============================================

/**
 * Atualiza assinatura
 */
function atualizarAssinatura() {
    const nome = document.getElementById('nomeResponsavel').value || 'Nome do Responsável Técnico';
    const crea = document.getElementById('creaResponsavel').value || 'CREA nº 000000/UF';
    const art = document.getElementById('artResponsavel').value;
    const dataElaboracao = document.getElementById('dataElaboracao').value;
    const enderecoObra = document.getElementById('enderecoObra').value || 'Local da Obra';
    
    // Atualizar assinatura
    document.getElementById('assinaturaNome').textContent = nome;
    document.getElementById('assinaturaCredencial').textContent = crea;
    
    if (art) {
        document.getElementById('assinaturaArt').textContent = `ART nº ${art}`;
        document.getElementById('assinaturaArt').style.display = 'block';
    } else {
        document.getElementById('assinaturaArt').style.display = 'none';
    }
    
    // Local e data
    if (dataElaboracao) {
        const data = new Date(dataElaboracao + 'T00:00:00');
        const dataFormatada = data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        
        const cidadeMatch = enderecoObra.match(/,\s*([^,]+)\s*-\s*[A-Z]{2}/);
        const cidade = cidadeMatch ? cidadeMatch[1].trim() : 'Local da Obra';
        
        document.getElementById('assinaturaLocal').textContent = `${cidade}, ${dataFormatada}`;
    }
}

/**
 * Atualiza histórico de revisões
 */
function atualizarHistoricoRevisao() {
    const data = document.getElementById('dataElaboracao').value;
    const responsavel = document.getElementById('nomeResponsavel').value || 'A definir';
    
    if (data) {
        const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
        document.getElementById('dataVersaoInicial').textContent = dataFormatada;
        document.getElementById('responsavelVersaoInicial').textContent = responsavel;
    }
}

// ============================================
// PERSISTÊNCIA DE DADOS
// ============================================

/**
 * Verifica suporte a localStorage
 */
function verificarSuporteLocalStorage() {
    try {
        const teste = '__storage_test__';
        localStorage.setItem(teste, teste);
        localStorage.removeItem(teste);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Salva dados localmente
 */
function salvarDadosLocal() {
    if (!verificarSuporteLocalStorage()) {
        alert('Seu navegador não suporta armazenamento local.\n\nUse a função de exportar dados (JSON) como alternativa.');
        return;
    }
    
    try {
        // Coletar todos os dados do formulário
        const dados = coletarDadosFormulario();
        dados.riscos = ESTADO.riscos;
        dados.versao = CONFIG.VERSION;
        dados.dataSalvamento = new Date().toISOString();
        
        // Salvar no localStorage
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(dados));
        
        ESTADO.dadosModificados = false;
        mostrarNotificacao('Dados salvos com sucesso!', 'success');
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
        alert('Erro ao salvar dados.\n\nVerifique o console para mais informações.');
    }
}

/**
 * Carrega dados salvos
 */
function carregarDadosLocal() {
    if (!verificarSuporteLocalStorage()) {
        alert('Seu navegador não suporta armazenamento local.');
        return;
    }
    
    try {
        const dadosSalvos = localStorage.getItem(CONFIG.STORAGE_KEY);
        
        if (!dadosSalvos) {
            alert('Nenhum dado salvo encontrado.');
            return;
        }
        
        if (ESTADO.dadosModificados) {
            if (!confirm('Existem dados não salvos.\n\nDeseja continuar e perder as alterações atuais?')) {
                return;
            }
        }
        
        const dados = JSON.parse(dadosSalvos);
        preencherFormulario(dados);
        
        // Carregar riscos
        document.getElementById('corpoInventarioRiscos').innerHTML = '';
        ESTADO.riscos = [];
        ESTADO.contadorRiscos = 0;
        
        if (dados.riscos && dados.riscos.length > 0) {
            dados.riscos.forEach(risco => {
                risco.id = ++ESTADO.contadorRiscos;
                ESTADO.riscos.push(risco);
                renderizarRisco(risco);
            });
        }
        
        atualizarEstatisticas();
        atualizarAssinatura();
        
        ESTADO.dadosModificados = false;
        mostrarNotificacao('Dados carregados com sucesso!', 'success');
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        alert('Erro ao carregar dados.\n\nO arquivo pode estar corrompido.');
    }
}

/**
 * Carrega dados salvos automaticamente ao iniciar
 */
function carregarDadosSalvos() {
    if (!verificarSuporteLocalStorage()) return;
    
    const dadosSalvos = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (dadosSalvos) {
        console.log('Dados salvos anteriormente encontrados');
    }
}

/**
 * Coleta dados do formulário
 */
function coletarDadosFormulario() {
    const campos = [
        'razaoSocial', 'cnpj', 'nomeObra', 'enderecoObra', 'cnae', 'grauRisco',
        'numTrabalhadores', 'nomeResponsavel', 'creaResponsavel', 'artResponsavel',
        'dataElaboracao', 'dataRevisao', 'versaoDocumento'
    ];
    
    const dados = {};
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            dados[campo] = elemento.value;
        }
    });
    
    return dados;
}

/**
 * Preenche formulário com dados
 */
function preencherFormulario(dados) {
    Object.keys(dados).forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento && dados[campo]) {
            elemento.value = dados[campo];
        }
    });
}

/**
 * Exporta dados como JSON
 */
function exportarJSON() {
    const dados = coletarDadosFormulario();
    dados.riscos = ESTADO.riscos;
    dados.versao = CONFIG.VERSION;
    dados.dataExportacao = new Date().toISOString();
    
    const json = JSON.stringify(dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const nomeArquivo = `PGR_${dados.razaoSocial || 'Dados'}_${new Date().toISOString().split('T')[0]}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    
    URL.revokeObjectURL(url);
    mostrarNotificacao('Dados exportados com sucesso!', 'success');
}

// ============================================
// VISUALIZAÇÃO E PDF
// ============================================

/**
 * Visualiza prévia
 */
function visualizarPrevia() {
    window.print();
}

/**
 * Gera PDF do PGR
 */
async function gerarPDF() {
    // Validar dados mínimos
    if (!validarDadosMinimos()) {
        return;
    }
    
    if (!confirm('Gerar PDF do Programa de Gerenciamento de Riscos?\n\nCertifique-se de que todos os dados estão corretos.\n\nO processo pode levar alguns instantes.')) {
        return;
    }
    
    const btnPDF = document.getElementById('btnGerarPDF');
    const textoOriginal = btnPDF.innerHTML;
    btnPDF.innerHTML = '<span class="btn-icon">⏳</span> Gerando PDF...';
    btnPDF.disabled = true;
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        let yPos = 20;
        const margem = 15;
        const larguraUtil = 180;
        let numPagina = 1;
        
        // Função auxiliar para adicionar nova página
        function novaPagina() {
            pdf.addPage();
            yPos = 20;
            numPagina++;
            adicionarRodape();
        }
        
        // Função auxiliar para adicionar rodapé
        function adicionarRodape() {
            pdf.setFontSize(8);
            pdf.setTextColor(128, 128, 128);
            pdf.text(`PGR - Programa de Gerenciamento de Riscos | Página ${numPagina}`, 105, 287, { align: 'center' });
            pdf.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')}`, 105, 292, { align: 'center' });
        }
        
        // === CAPA ===
        pdf.setFillColor(30, 58, 138);
        pdf.rect(0, 0, 210, 297, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(28);
        pdf.setFont(undefined, 'bold');
        pdf.text('PROGRAMA DE', 105, 80, { align: 'center' });
        pdf.text('GERENCIAMENTO DE RISCOS', 105, 92, { align: 'center' });
        pdf.text('PGR', 105, 104, { align: 'center' });
        
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');
        pdf.text('Conforme NR-01 - Gerenciamento de Riscos Ocupacionais', 105, 125, { align: 'center' });
        pdf.text('Aplicado à Indústria da Construção Civil - NR-18', 105, 135, { align: 'center' });
        
        const razaoSocial = document.getElementById('razaoSocial').value || 'Nome da Empresa';
        const nomeObra = document.getElementById('nomeObra').value || 'Nome da Obra';
        
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text(razaoSocial, 105, 165, { align: 'center' });
        pdf.text(nomeObra, 105, 175, { align: 'center' });
        
        const dataElaboracao = document.getElementById('dataElaboracao').value;
        if (dataElaboracao) {
            const dataFormatada = new Date(dataElaboracao + 'T00:00:00').toLocaleDateString('pt-BR');
            pdf.setFontSize(11);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Data de Elaboração: ${dataFormatada}`, 105, 260, { align: 'center' });
        }
        
        const versao = document.getElementById('versaoDocumento').value || '1.0';
        pdf.text(`Versão: ${versao}`, 105, 270, { align: 'center' });
        
        adicionarRodape();
        
        // === PÁGINAS DE CONTEÚDO ===
        novaPagina();
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('1. IDENTIFICAÇÃO DA EMPRESA E DO ESTABELECIMENTO', margem, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        const dadosIdentificacao = [
            ['Razão Social:', razaoSocial],
            ['CNPJ:', document.getElementById('cnpj').value],
            ['Obra:', nomeObra],
            ['Endereço:', document.getElementById('enderecoObra').value],
            ['CNAE:', document.getElementById('cnae').value],
            ['Grau de Risco:', document.getElementById('grauRisco').selectedOptions[0]?.text],
            ['Nº Trabalhadores:', document.getElementById('numTrabalhadores').value],
            ['Responsável Técnico:', document.getElementById('nomeResponsavel').value],
            ['CREA:', document.getElementById('creaResponsavel').value],
            ['ART:', document.getElementById('artResponsavel').value]
        ];
        
        dadosIdentificacao.forEach(([label, valor]) => {
            if (yPos > 270) novaPagina();
            pdf.setFont(undefined, 'bold');
            pdf.text(label, margem, yPos);
            pdf.setFont(undefined, 'normal');
            const linhas = pdf.splitTextToSize(valor || 'Não informado', 120);
            pdf.text(linhas, margem + 45, yPos);
            yPos += Math.max(6, linhas.length * 5);
        });
        
        // === INVENTÁRIO DE RISCOS ===
        novaPagina();
        
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('4. INVENTÁRIO DE RISCOS OCUPACIONAIS', margem, yPos);
        yPos += 12;
        
        ESTADO.riscos.forEach((risco, index) => {
            if (index > 0) novaPagina();
            
            const valor = MATRIZ_PROBABILIDADE[risco.probabilidade] * MATRIZ_SEVERIDADE[risco.severidade];
            const classificacao = CLASSIFICACAO_RISCO[valor];
            
            // Cabeçalho do risco com cor
            const corRGB = hexToRgb(classificacao.cor);
            pdf.setFillColor(corRGB.r, corRGB.g, corRGB.b);
            pdf.rect(margem, yPos - 5, larguraUtil, 10, 'F');
            
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text(`RISCO ${index + 1} - NÍVEL: ${classificacao.nivel.toUpperCase()}`, margem + 2, yPos + 1);
            yPos += 12;
            
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(10);
            
            const camposRisco = [
                ['Atividade:', risco.atividade],
                ['Perigo:', risco.perigo],
                ['Tipo:', risco.tipoRisco],
                ['Fonte:', risco.fonte],
                ['Consequências:', risco.consequencias],
                ['Probabilidade:', risco.probabilidade],
                ['Severidade:', risco.severidade]
            ];
            
            camposRisco.forEach(([label, valor]) => {
                if (yPos > 265) novaPagina();
                pdf.setFont(undefined, 'bold');
                pdf.text(label, margem, yPos);
                yPos += 5;
                pdf.setFont(undefined, 'normal');
                const linhas = pdf.splitTextToSize(valor || '-', larguraUtil - 5);
                pdf.text(linhas, margem, yPos);
                yPos += linhas.length * 4 + 3;
            });
            
            // Adicionar foto se existir
            if (risco.foto) {
                if (yPos > 200) novaPagina();
                yPos += 5;
                pdf.setFont(undefined, 'bold');
                pdf.text('Evidência Fotográfica:', margem, yPos);
                yPos += 5;
                try {
                    pdf.addImage(risco.foto, 'JPEG', margem, yPos, 80, 60);
                    yPos += 65;
                } catch (e) {
                    console.error('Erro ao adicionar imagem:', e);
                    pdf.setFont(undefined, 'italic');
                    pdf.text('[Imagem anexada - erro ao renderizar]', margem, yPos);
                    yPos += 5;
                }
            }
        });
        
        // === PLANO DE AÇÃO ===
        if (ESTADO.planoAcaoGerado) {
            novaPagina();
            
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text('5. PLANO DE AÇÃO - MEDIDAS DE PREVENÇÃO', margem, yPos);
            yPos += 12;
            
            pdf.setFontSize(9);
            
            const acoes = obterAcoesPlanoAcao();
            acoes.forEach((acao, index) => {
                if (yPos > 250) novaPagina();
                
                pdf.setFont(undefined, 'bold');
                pdf.text(`Ação ${index + 1}:`, margem, yPos);
                yPos += 5;
                
                pdf.setFont(undefined, 'normal');
                let linhas = pdf.splitTextToSize(`Risco: ${acao.risco}`, larguraUtil);
                pdf.text(linhas, margem, yPos);
                yPos += linhas.length * 4;
                
                linhas = pdf.splitTextToSize(`Medida: ${acao.medida}`, larguraUtil);
                pdf.text(linhas, margem, yPos);
                yPos += linhas.length * 4;
                
                pdf.text(`Prioridade: ${acao.prioridade} | Prazo: ${acao.prazo}`, margem, yPos);
                yPos += 8;
            });
        }
        
        // === ASSINATURA ===
        novaPagina();
        
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('7. DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA', margem, yPos);
        yPos += 15;
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const textoDeclaracao = pdf.splitTextToSize(
            'Declaro, para os devidos fins de direito e sob as penas da lei, que o presente Programa de Gerenciamento de Riscos (PGR) foi elaborado em estrita conformidade com as disposições da Norma Regulamentadora NR-01 (Gerenciamento de Riscos Ocupacionais) e demais normas aplicáveis, constituindo instrumento técnico-legal válido para fins de fiscalização trabalhista, auditoria, defesa pericial e demais finalidades previstas em lei.',
            larguraUtil
        );
        pdf.text(textoDeclaracao, margem, yPos);
        yPos += textoDeclaracao.length * 5 + 20;
        
        // Linha de assinatura
        pdf.line(60, yPos, 150, yPos);
        yPos += 5;
        
        const nomeResp = document.getElementById('nomeResponsavel').value || 'Nome do Responsável';
        const creaResp = document.getElementById('creaResponsavel').value || 'CREA nº 000000/UF';
        const artResp = document.getElementById('artResponsavel').value;
        
        pdf.setFont(undefined, 'bold');
        pdf.text(nomeResp, 105, yPos, { align: 'center' });
        yPos += 5;
        
        pdf.setFont(undefined, 'normal');
        pdf.text('Engenheiro de Segurança do Trabalho', 105, yPos, { align: 'center' });
        yPos += 5;
        pdf.text(creaResp, 105, yPos, { align: 'center' });
        
        if (artResp) {
            yPos += 5;
            pdf.text(`ART nº ${artResp}`, 105, yPos, { align: 'center' });
        }
        
        // Salvar PDF
        const nomeArquivo = `PGR_${razaoSocial.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(nomeArquivo);
        
        mostrarNotificacao('PDF gerado com sucesso!', 'success');
        
    } catch (erro) {
        console.error('Erro ao gerar PDF:', erro);
        alert('Erro ao gerar PDF.\n\nVerifique o console para mais detalhes.');
    } finally {
        btnPDF.innerHTML = textoOriginal;
        btnPDF.disabled = false;
    }
}

/**
 * Converte hex para RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

/**
 * Obtém ações do plano de ação
 */
function obterAcoesPlanoAcao() {
    const acoes = [];
    const linhas = document.querySelectorAll('#corpoPlanoAcao tr');
    
    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 6) {
            acoes.push({
                risco: colunas[0].textContent.trim(),
                medida: colunas[1].textContent.trim(),
                prioridade: colunas[2].textContent.trim(),
                responsavel: colunas[3].querySelector('input')?.value || colunas[3].textContent.trim(),
                prazo: colunas[4].querySelector('input')?.value || colunas[4].textContent.trim(),
                status: colunas[5].querySelector('select')?.value || colunas[5].textContent.trim()
            });
        }
    });
    
    return acoes;
}

/**
 * Valida dados mínimos
 */
function validarDadosMinimos() {
    const camposObrigatorios = [
        { id: 'razaoSocial', nome: 'Razão Social' },
        { id: 'nomeObra', nome: 'Nome da Obra' },
        { id: 'enderecoObra', nome: 'Endereço da Obra' },
        { id: 'nomeResponsavel', nome: 'Nome do Responsável Técnico' },
        { id: 'creaResponsavel', nome: 'CREA do Responsável' }
    ];
    
    const camposFaltantes = [];
    
    camposObrigatorios.forEach(campo => {
        const valor = document.getElementById(campo.id).value.trim();
        if (!valor) {
            camposFaltantes.push(campo.nome);
        }
    });
    
    if (camposFaltantes.length > 0) {
        alert(`Preencha os campos obrigatórios:\n\n• ${camposFaltantes.join('\n• ')}`);
        return false;
    }
    
    if (ESTADO.riscos.length === 0) {
        alert('Adicione pelo menos um risco ao inventário antes de gerar o PDF.');
        return false;
    }
    
    return true;
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Mostra notificação temporária
 */
function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    notificacao.textContent = mensagem;
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacao.remove(), 300);
    }, 3000);
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.removerRisco = removerRisco;
window.ampliarFoto = ampliarFoto;

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('Sistema PGR carregado completamente');
