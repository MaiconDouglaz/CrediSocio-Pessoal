// banco.js - Gestão de Dados Centralizada (Versão Estabilizada)
const USUARIO_ID = "usuario_1"; 

const Banco = {
    getDados: () => {
        const dados = localStorage.getItem(`app_financeiro_${USUARIO_ID}`);
        return dados ? JSON.parse(dados) : { clientes: [] };
    },

    salvarDados: (dados) => {
        localStorage.setItem(`app_financeiro_${USUARIO_ID}`, JSON.stringify(dados));
    },

    adicionarCliente: (objetoCliente) => {
        let dados = Banco.getDados();
        const nomeNovo = objetoCliente.nome.trim().toUpperCase();
        
        if (!dados.clientes.find(c => c.nome.trim().toUpperCase() === nomeNovo)) {
            if (!objetoCliente.dividas) objetoCliente.dividas = [];
            // Garante que o nome do cliente no objeto também esteja em maiúsculas
            objetoCliente.nome = nomeNovo;
            dados.clientes.push(objetoCliente);
            Banco.salvarDados(dados);
            return true;
        }
        return false;
    },

    salvarNovaDivida: (nomeCliente, novaDivida) => {
        let dados = Banco.getDados();
        const nomeBusca = decodeURIComponent(nomeCliente).trim().toUpperCase();
        let cliente = dados.clientes.find(c => c.nome.trim().toUpperCase() === nomeBusca);

        if (cliente) {
            if (!cliente.dividas) cliente.dividas = [];

            if (novaDivida.parcelas && novaDivida.parcelas.length > 0) {
                novaDivida.parcelas = novaDivida.parcelas.map((p, index) => ({
                    id: Date.now() + index, 
                    numero: p.numero || (index + 1),
                    valor: parseFloat(p.valor) || 0,
                    pago: parseFloat(p.pago) || 0,
                    vencimento: p.vencimento || p.dataVencimento || "", // Suporta ambos os nomes de campo
                    dataPagamento: p.dataPagamento || "",
                    status: p.status || "pendente"
                }));
            } else {
                const totalParcelas = parseInt(novaDivida.totalParcelas) || 1;
                const valorCada = parseFloat(novaDivida.valorTotal) / totalParcelas;
                
                novaDivida.parcelas = [];
                for (let i = 1; i <= totalParcelas; i++) {
                    novaDivida.parcelas.push({
                        id: Date.now() + i, 
                        numero: i,
                        valor: valorCada,
                        pago: 0,
                        vencimento: "", 
                        dataPagamento: "",
                        status: "pendente"
                    });
                }
            }

            novaDivida.totalPago = novaDivida.parcelas.reduce((acc, p) => acc + (parseFloat(p.pago) || 0), 0);
            novaDivida.historicoPagamentos = novaDivida.historicoPagamentos || [];
            
            cliente.dividas.push(novaDivida);
            Banco.salvarDados(dados);
            return true;
        }
        return false;
    },

    atualizarDivida: (nomeCliente, tituloDivida, dividaAtualizada) => {
        let dados = Banco.getDados();
        const nomeBusca = decodeURIComponent(nomeCliente).trim().toUpperCase();
        let cliente = dados.clientes.find(c => c.nome.trim().toUpperCase() === nomeBusca);

        if (cliente) {
            const tituloBusca = tituloDivida.trim().toUpperCase();
            let indexDivida = cliente.dividas.findIndex(d => d.titulo.trim().toUpperCase() === tituloBusca);
            
            if (indexDivida !== -1) {
                // Mantém o histórico se a atualização não trouxer um novo
                if (!dividaAtualizada.historicoPagamentos) {
                    dividaAtualizada.historicoPagamentos = cliente.dividas[indexDivida].historicoPagamentos || [];
                }
                cliente.dividas[indexDivida] = dividaAtualizada;
                Banco.salvarDados(dados);
                return true;
            }
        }
        return false;
    },

    atualizarParcelas: (nomeCliente, tituloDivida, listaParcelas) => {
        let dados = Banco.getDados();
        const nomeBusca = decodeURIComponent(nomeCliente).trim().toUpperCase();
        let cliente = dados.clientes.find(c => c.nome.trim().toUpperCase() === nomeBusca);

        if (cliente) {
            const tituloBusca = tituloDivida.trim().toUpperCase();
            let div = cliente.dividas.find(d => d.titulo.trim().toUpperCase() === tituloBusca);
            
            if (div) {
                div.parcelas = listaParcelas;
                // ESSENCIAL: Recalcula o valor total da dívida com base nas parcelas atuais
                // Isso faz o sistema de "Abatimento" funcionar na prática
                div.valorTotal = listaParcelas.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);
                div.totalPago = listaParcelas.reduce((acc, p) => acc + parseFloat(p.pago || 0), 0);
                div.totalParcelas = listaParcelas.length;
                
                Banco.salvarDados(dados);
                return true;
            }
        }
        return false;
    },

    registrarPagamentoParcela: (nomeCliente, tituloDivida, parcelaId, valorPago) => {
        let dados = Banco.getDados();
        const nomeBusca = decodeURIComponent(nomeCliente).trim().toUpperCase();
        let cliente = dados.clientes.find(c => c.nome.trim().toUpperCase() === nomeBusca);

        if (cliente) {
            const tituloBusca = tituloDivida.trim().toUpperCase();
            let div = cliente.dividas.find(d => d.titulo.trim().toUpperCase() === tituloBusca);
            
            if (div) {
                let parcela = div.parcelas.find(p => p.id == parcelaId);
                if (parcela) {
                    parcela.pago = parseFloat(valorPago);
                    parcela.status = parcela.pago >= parcela.valor ? "pago" : "pendente";
                    parcela.dataPagamento = new Date().toLocaleDateString('pt-BR');

                    div.totalPago = div.parcelas.reduce((acc, p) => acc + parseFloat(p.pago || 0), 0);
                    
                    if(!div.historicoPagamentos) div.historicoPagamentos = [];
                    div.historicoPagamentos.push({
                        data: parcela.dataPagamento,
                        valor: parseFloat(valorPago),
                        parcela: parcela.numero
                    });

                    Banco.salvarDados(dados);
                    return true;
                }
            }
        }
        return false;
    }
};