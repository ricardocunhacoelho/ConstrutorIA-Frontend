import { Component, Injector, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import { ObraComTarefasDto, RankingMaterialSolicitadoDto, SolicitacaoMaterialDto, SolicitacaoMaterialServiceProxy, TarefaDto, TarefaServiceProxy } from '../../shared/service-proxies/service-proxies';
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

    @ViewChild('donutChart') donutChart?: BaseChartDirective;
    @ViewChild('topMateriaisChart') topMateriaisChart?: BaseChartDirective;
    @ViewChild('obrasChart') obrasChart?: BaseChartDirective;
    @ViewChild('donutChartTarefas') donutChartTarefas?: BaseChartDirective;
    @ViewChild('tarefasPorObraChart') tarefasPorObraChart?: BaseChartDirective;


    public donutChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
    };


    public donutChartData = {
        labels: ['ABERTA', 'CONCLUÍDA'],
        datasets: [
            {
                data: [0, 0],
                backgroundColor: ['#ffc107', '#28a745'],
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
        private cdr: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
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


    carregarUltimasSolicitacoes() {
        this._solicitacaoService.getAll(undefined, undefined, undefined, undefined, 0, 20)
            .subscribe(result => {
                this.ultimasSolicitacoes = result.items || [];
                const abertas = this.ultimasSolicitacoes.filter(s => s.status === 'ABERTA').length;
                const concluidas = this.ultimasSolicitacoes.length - abertas;

                this.donutChartData = {
                    ...this.donutChartData,
                    datasets: [
                        { ...this.donutChartData.datasets[0], data: [abertas, concluidas] }
                    ]
                };

                this.donutChart?.chart?.update();

                this.cdr.markForCheck();
            });
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
                this.obrasChartData = {
                    labels: result.map(r => r.nomeObra),
                    datasets: [
                        {
                            label: 'Abertas',
                            data: result.map(r => r.quantidadeAbertas),
                            backgroundColor: '#ffc107'
                        },
                        {
                            label: 'Concluídas',
                            data: result.map(r => r.quantidadeConcluidas),
                            backgroundColor: '#28a745'
                        }
                    ]
                };

                this.obrasChart?.chart?.update();
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