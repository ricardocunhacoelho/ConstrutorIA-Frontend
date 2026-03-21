import { Component, Injector, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import {
    ObraComTarefasDto,
    RankingMaterialSolicitadoDto,
    SolicitacaoMaterialDto,
    SolicitacaoMaterialServiceProxy,
    TarefaDto,
    TarefaServiceProxy,
    SolicitacaoMaterialStatus
} from '../../shared/service-proxies/service-proxies';
import { EnumServiceProxy, EnumValueDto } from '../../shared/service-proxies/service-proxies'; // Adicione esta importação
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CommonModule } from '@angular/common';
import { CollapseModule } from 'ngx-bootstrap/collapse';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import {
    Chart,
    DoughnutController, ArcElement, Tooltip, Legend,
    BarController, BarElement, CategoryScale, LinearScale
} from 'chart.js';

// Registrar os controllers, elementos e escalas necessárias
Chart.register(
    DoughnutController, ArcElement, Tooltip, Legend,
    BarController, BarElement, CategoryScale, LinearScale
);

@Component({
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [appModuleAnimation()],
    standalone: true,
    imports: [LocalizePipe, CommonModule, CollapseModule, BaseChartDirective],
})
export class HomeComponent extends AppComponentBase implements OnInit {
    ultimasSolicitacoes: SolicitacaoMaterialDto[] = [];
    obrasComTarefas: ObraComTarefasDto[] = [];
    collapseStatesSolic: boolean[] = [];
    collapseStatesTarefas: boolean[] = [];

    // Mapeamento de status será preenchido pelo service
    private statusMap: Map<number, { label: string; class: string; color: string }> = new Map();

    // Cores pré-definidas para cada status (serão associadas dinamicamente)
    // Cores pré-definidas para cada status (alinhadas com a lista de solicitações)
    private statusColors: string[] = [
        '#616161',    // 0 - Aberta (bg-secondary = preto)
        '#fd7e14',    // 1 - Cotações em andamento (bg-orange)
        '#fd7e14',    // 2 - Cotações + orçamentos (bg-orange)
        '#6f42c1',    // 3 - Orçamentos disponíveis (bg-purple)
        '#17a2b8',    // 4 - Pedido realizado (bg-info)
        '#17a2b8',    // 5 - Pedido parcialmente concluído (bg-info)
        '#007bff',    // 6 - Pedido concluído, disponível para pagamento (bg-primary)
        '#dc3545',    // 7 - Pedido cancelado (bg-danger)
        '#dc3545',    // 8 - Intervenção necessária (bg-danger)
        '#28a745',    // 9 - Compras concluídas, pagamentos realizados (bg-success)
        '#6c757d'     // 10 - Solicitação substituída (bg-substituida = cinza)
    ];

    @ViewChild('donutChart') donutChart?: BaseChartDirective;
    @ViewChild('topMateriaisChart') topMateriaisChart?: BaseChartDirective;
    @ViewChild('obrasChart') obrasChart?: BaseChartDirective;
    @ViewChild('donutChartTarefas') donutChartTarefas?: BaseChartDirective;
    @ViewChild('tarefasPorObraChart') tarefasPorObraChart?: BaseChartDirective;

    public donutChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels?.length && data.datasets.length) {
                            return data.labels.map((label, i) => ({
                                text: label as string,
                                fillStyle: Array.isArray(data.datasets[0].backgroundColor)
                                    ? data.datasets[0].backgroundColor[i]
                                    : '#000',
                                strokeStyle: 'transparent',
                                lineWidth: 0,
                                hidden: false,
                                index: i
                            }));
                        }
                        return [];
                    }
                }
            }
        }
    };

    public donutChartData = {
        labels: [],
        datasets: [
            {
                data: [],
                backgroundColor: [],
                hoverOffset: 10,
                cutout: '50%'
            }
        ]
    };

    public donutChartType: ChartType = 'doughnut';

    // ----------------- Gráfico Top Materiais -----------------
    public topMateriaisChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 200,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true }
        }
    };

    public topMateriaisChartData: ChartConfiguration['data'] = {
        labels: [],
        datasets: [
            {
                data: [],
                backgroundColor: '#007bff'
            }
        ]
    };
    public topMateriaisChartType: ChartType = 'bar';

    // ----------------- Gráfico Solicitações por Obra -----------------
    public obrasChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true },
            x: { ticks: { autoSkip: false } }
        }
    };

    public obrasChartData: ChartConfiguration['data'] = {
        labels: [],
        datasets: [
            {
                label: 'Abertas',
                data: [],
                backgroundColor: '#ffc107'
            },
            {
                label: 'Concluídas',
                data: [],
                backgroundColor: '#28a745'
            }
        ]
    };

    public obrasChartType: ChartType = 'bar';

    // ----------------- Tarefas Donut -----------------
    public donutChartTarefasData = {
        labels: ['PENDENTE', 'FINALIZADA'],
        datasets: [
            {
                data: [0, 0],
                backgroundColor: ['#dc3545', '#28a745'],
                hoverOffset: 10,
                cutout: '50%'
            }
        ]
    };
    public donutChartTarefasType: ChartType = 'doughnut';
    public donutChartTarefasOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
    };

    // ----------------- Tarefas Por Obras -----------------
    public tarefasPorObraChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
            x: { stacked: true, ticks: { autoSkip: false } },
            y: { stacked: true, beginAtZero: true }
        }
    };

    public tarefasPorObraChartData: ChartConfiguration['data'] = {
        labels: [],
        datasets: [
            {
                label: 'Pendentes',
                data: [],
                backgroundColor: '#dc3545'
            },
            {
                label: 'Concluídas',
                data: [],
                backgroundColor: '#28a745'
            }
        ]
    };
    public tarefasPorObraChartType: ChartType = 'bar';

    constructor(
        injector: Injector,
        private _solicitacaoService: SolicitacaoMaterialServiceProxy,
        private _tarefaService: TarefaServiceProxy,
        private _enumService: EnumServiceProxy, // Adicione o service de enums
        private cdr: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        // Primeiro carrega os status do enum
        this.carregarStatusSolicitacao();

        this.carregarUltimasSolicitacoes();
        this.carregarTopMateriais();
        this.carregarSolicitacoesPorObra();
        this.carregarObrasComTarefas();
        this.carregarUltimasTarefas();
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.donutChart?.chart?.resize();
            this.topMateriaisChart?.chart?.resize();
            this.obrasChart?.chart?.resize();
            this.donutChartTarefas?.chart?.resize();
            this.tarefasPorObraChart?.chart?.resize();
        }, 0);
    }

    // Carrega os status do enum do backend
    private carregarStatusSolicitacao(): void {
        this._enumService.getSolicitacaoMaterialStatus().subscribe({
            next: (statusList: EnumValueDto[]) => {
                statusList.forEach((status, index) => {
                    // Determina a classe CSS baseada no tipo de status
                    let cssClass = this.determinarClasseStatus(status.value);

                    this.statusMap.set(status.value, {
                        label: status.description || status.name,
                        class: cssClass,
                        color: this.statusColors[index] || '#6c757d'
                    });
                });

                // Atualiza o gráfico se já houver solicitações carregadas
                if (this.ultimasSolicitacoes.length > 0) {
                    this.atualizarGraficoStatusSolicitacoes();
                }

                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('Erro ao carregar status:', error);
                // Fallback para caso o service falhe
                this.carregarStatusFallback();
            }
        });
    }

    // Fallback caso o service de enums falhe
    private carregarStatusFallback(): void {
        const statusFallback = [
            { value: 0, label: 'Aberta', class: 'bg-secondary text-white', color: '#000000' },
            { value: 1, label: 'Cotações em andamento', class: 'bg-orange text-white', color: '#fd7e14' },
            { value: 2, label: 'Cotações e orçamentos', class: 'bg-orange text-white', color: '#fd7e14' },
            { value: 3, label: 'Orçamentos disponíveis', class: 'bg-purple text-white', color: '#6f42c1' },
            { value: 4, label: 'Pedido realizado', class: 'bg-info text-white', color: '#17a2b8' },
            { value: 5, label: 'Parcialmente concluído', class: 'bg-info text-white', color: '#17a2b8' },
            { value: 6, label: 'Disponível p/ pagamento', class: 'bg-primary text-white', color: '#007bff' },
            { value: 7, label: 'Cancelado', class: 'bg-danger text-white', color: '#dc3545' },
            { value: 8, label: 'Intervenção necessária', class: 'bg-danger text-white', color: '#dc3545' },
            { value: 9, label: 'Concluída', class: 'bg-success text-white', color: '#28a745' },
            { value: 10, label: 'Substituída', class: 'bg-substituida text-white', color: '#6c757d' }
        ];

        statusFallback.forEach(status => {
            this.statusMap.set(status.value, {
                label: status.label,
                class: status.class,
                color: status.color
            });
        });
    }

    // Determina a classe CSS baseada no valor do status (alinhada com getStatusClass da lista)
    private determinarClasseStatus(statusValue: number): string {
        switch (statusValue) {
            case 0: return 'bg-secondary text-white';      // Aberta
            case 1: return 'bg-orange text-white';         // Cotações em andamento
            case 2: return 'bg-orange text-white';         // Cotações + orçamentos
            case 3: return 'bg-purple text-white';         // Orçamentos disponíveis
            case 4: return 'bg-info text-white';           // Pedido realizado
            case 5: return 'bg-info text-white';           // Pedido parcialmente concluído
            case 6: return 'bg-primary text-white';        // Pedido concluído, disponível para pagamento
            case 7: return 'bg-danger text-white';         // Cancelado
            case 8: return 'bg-danger text-white';         // Intervenção necessária
            case 9: return 'bg-success text-white';        // Compras concluídas
            case 10: return 'bg-substituida text-white';   // Solicitação substituída
            default: return 'bg-secondary text-white';
        }
    }

    carregarUltimasSolicitacoes() {
        this._solicitacaoService.getAll(undefined, undefined, undefined, undefined, 0, 20)
            .subscribe(result => {
                this.ultimasSolicitacoes = result.items || [];
                this.collapseStatesSolic = this.ultimasSolicitacoes.map(() => false);

                // Atualizar gráfico de donut com todos os status
                this.atualizarGraficoStatusSolicitacoes();

                this.cdr.markForCheck();
            });
    }

    private atualizarGraficoStatusSolicitacoes() {
        // Se o statusMap ainda estiver vazio, não atualiza o gráfico
        if (this.statusMap.size === 0) return;

        // Agrupar solicitações por status
        const statusCount = new Map<number, number>();

        this.ultimasSolicitacoes.forEach(s => {
            const count = statusCount.get(s.status) || 0;
            statusCount.set(s.status, count + 1);
        });

        // Preparar dados para o gráfico
        const labels: string[] = [];
        const data: number[] = [];
        const colors: string[] = [];

        // Ordenar por status para consistência
        Array.from(statusCount.entries())
            .sort(([statusA], [statusB]) => statusA - statusB)
            .forEach(([status, count]) => {
                const statusInfo = this.statusMap.get(status);
                if (statusInfo) {
                    labels.push(statusInfo.label);
                    data.push(count);
                    colors.push(statusInfo.color);
                }
            });

        // Só atualiza se houver dados
        if (labels.length > 0) {
            this.donutChartData = {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: colors,
                        hoverOffset: 10,
                        cutout: '50%'
                    }
                ]
            };

            // Forçar atualização do gráfico
            setTimeout(() => {
                this.donutChart?.chart?.update();
            }, 100);
        }
    }

    carregarTopMateriais() {
        this._solicitacaoService.getTopMateriaisSolicitados()
            .subscribe((result: RankingMaterialSolicitadoDto[]) => {
                const labels = result.map(m => m.nome);
                const values = result.map(m => m.quantidadeSolicitacoes);

                this.topMateriaisChartData = {
                    labels: [...labels],
                    datasets: [{ data: [...values], backgroundColor: '#007bff' }]
                };

                this.topMateriaisChart?.chart?.update();
                this.cdr.markForCheck();
            });
    }

    carregarSolicitacoesPorObra() {
    this._solicitacaoService.getSolicitacoesPorObra()
        .subscribe(result => {
            // Cores alinhadas com a lista de solicitações e o mapeamento de status
            const cores = [
                '#616161',    // 0 - Aberta (bg-secondary = preto)
                '#fd7e14',    // 1 - Cotações em andamento (bg-orange)
                '#6f42c1',    // 3 - Orçamentos disponíveis (bg-purple)
                '#17a2b8',    // 4 - Pedido realizado (bg-info)
                '#17a2b8',    // 5 - Pedido parcialmente concluído (bg-info)
                '#007bff',    // 6 - Pedido concluído, disponível para pagamento (bg-primary)
                '#dc3545',    // 7 - Pedido cancelado (bg-danger)
                '#dc3545',    // 8 - Intervenção necessária (bg-danger)
                '#28a745'     // 9 - Compras concluídas, pagamentos realizados (bg-success)
                // Nota: Status 10 (Substituída) pode ser adicionado se existir no DTO
            ];

            this.obrasChartData = {
                labels: result.map(r => r.nomeObra),
                datasets: [
                    {
                        label: 'Aberta',
                        data: result.map(r => r.quantidadeAbertas),
                        backgroundColor: cores[0],
                        stack: 'status'
                    },
                    {
                        label: 'Cotações em andamento',
                        data: result.map(r => r.quantidadeCotacoesEmAndamento),
                        backgroundColor: cores[1],
                        stack: 'status'
                    },
                    {
                        label: 'Orçamentos disponíveis',
                        data: result.map(r => r.quantidadeOrcamentosDisponiveis),
                        backgroundColor: cores[2],
                        stack: 'status'
                    },
                    {
                        label: 'Aguardando confirmação',
                        data: result.map(r => r.quantidadeAguardandoConfirmacao),
                        backgroundColor: cores[3],
                        stack: 'status'
                    },
                    {
                        label: 'Parcialmente concluído',
                        data: result.map(r => r.quantidadeParcialmenteConcluido),
                        backgroundColor: cores[4],
                        stack: 'status'
                    },
                    {
                        label: 'Disponível p/ pagamento',
                        data: result.map(r => r.quantidadeDisponivelPagamento),
                        backgroundColor: cores[5],
                        stack: 'status'
                    },
                    {
                        label: 'Canceladas',
                        data: result.map(r => r.quantidadeCanceladas),
                        backgroundColor: cores[6],
                        stack: 'status'
                    },
                    {
                        label: 'Intervenção necessária',
                        data: result.map(r => r.quantidadeIntervencao),
                        backgroundColor: cores[7],
                        stack: 'status'
                    },
                    {
                        label: 'Concluída (pago)',
                        data: result.map(r => r.quantidadeConcluidas),
                        backgroundColor: cores[8],
                        stack: 'status'
                    }
                ]
            };

            this.obrasChartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        maxHeight: 150,
                        labels: { 
                            boxWidth: 12,
                            font: {
                                size: 11,
                                weight: 'normal'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.raw as number;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: { 
                            autoSkip: false, 
                            maxRotation: 45, 
                            minRotation: 45,
                            font: {
                                size: 11,
                                weight: 'normal' // Use 'normal' ao invés de '500'
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: { 
                            display: true, 
                            text: 'Quantidade de solicitações',
                            font: {
                                size: 12,
                                weight: 'bold' // Use 'bold' ao invés de '500' para negrito
                            }
                        }
                    }
                }
            };

            // Forçar atualização do gráfico
            setTimeout(() => {
                this.obrasChart?.chart?.update();
            }, 100);
            
            this.cdr.markForCheck();
        });
}

    carregarUltimasTarefas() {
        this._tarefaService.getAll(undefined, undefined, undefined, undefined, 0, 20)
            .subscribe(result => {
                const pendentes = result.items.filter(t => t.status === 'PENDENTE').length;
                const finalizadas = result.items.length - pendentes;

                this.donutChartTarefasData = {
                    ...this.donutChartTarefasData,
                    datasets: [
                        { ...this.donutChartTarefasData.datasets[0], data: [pendentes, finalizadas] }
                    ]
                };

                this.donutChartTarefas?.chart?.update();
                this.cdr.markForCheck();
            });
    }

    carregarObrasComTarefas(): void {
        this._tarefaService.getObrasComTarefas().subscribe(result => {
            this.obrasComTarefas = result;
            this.collapseStatesTarefas = result.map(() => false);

            this.tarefasPorObraChartData = {
                labels: result.map(r => r.nomeObra),
                datasets: [
                    {
                        label: 'Pendentes',
                        data: result.map(r => r.quantidadePendentes),
                        backgroundColor: '#dc3545'
                    },
                    {
                        label: 'Finalizadas',
                        data: result.map(r => r.quantidadeConcluidas),
                        backgroundColor: '#28a745'
                    }
                ]
            };

            this.tarefasPorObraChart?.chart?.update();
            this.cdr.markForCheck();
        });
    }

    // Métodos utilitários para status
    getStatusLabel(status: SolicitacaoMaterialStatus): string {
        return this.statusMap.get(status)?.label || 'Desconhecido';
    }

    getStatusClass(status: SolicitacaoMaterialStatus): string {
        return this.statusMap.get(status)?.class || 'bg-secondary text-white';
    }

    getStatusColor(status: SolicitacaoMaterialStatus): string {
        return this.statusMap.get(status)?.color || '#6c757d';
    }

    getCotacoesTooltip(cotacoes: any[]): string {
        if (!cotacoes || cotacoes.length === 0) return '';
        return cotacoes.map(c => `${c.fornecedor?.nome || 'Fornecedor'}: R$ ${c.valorTotal?.toFixed(2) || '0,00'}`).join('\n');
    }

    toggleCollapseSolic(i: number) {
        this.collapseStatesSolic[i] = !this.collapseStatesSolic[i];
    }

    toggleCollapseTarefas(i: number) {
        this.collapseStatesTarefas[i] = !this.collapseStatesTarefas[i];
    }

    formatarMateriais(materiais: { nome: string; quantidade: number }[] | undefined): string {
        if (!materiais || materiais.length === 0) return '-';
        return materiais.map(m => `${m.nome} (${m.quantidade})`).join(', ');
    }
}