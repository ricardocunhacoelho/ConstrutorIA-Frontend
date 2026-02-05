import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import { CreateMaterialSolicitadoDto, EncarregadoComObraDto, SolicitacaoMaterialServiceProxy, UpdateMaterialSolicitadoDto } from '../../../shared/service-proxies/service-proxies';
import { SolicitacaoMaterialStatus, UpdateSolicitacaoMaterialDto } from '../../../shared/service-proxies/service-proxies';
import { forkJoin } from 'rxjs';

interface MaterialSolicitadoUI extends UpdateMaterialSolicitadoDto {
    unidadeSelecionada?: string | null;
    unidadeComplemento?: string | null;
}

@Component({
    templateUrl: './edit-solicitacao-material-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        TabsetComponent,
        TabDirective,
        LocalizePipe,
        NgIf
    ]
})
export class EditSolicitacaoMaterialDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    solicitacao = new UpdateSolicitacaoMaterialDto();
    materiais: MaterialSolicitadoUI[] = [];
    resolucao = '';
    id?: string;

    encarregadosComObras: EncarregadoComObraDto[] = [];
    selectedEncarregado?: EncarregadoComObraDto;
    SolicitacaoMaterialStatus: any;

    unidadesPadrao = [
        // Unidade básica
        'unidade(s)',
        'peça(s)',

        // Sacos (materiais de obra)
        'saco(s)',
        'saco(s) de 100kg',
        'saco(s) de 80kg',
        'saco(s) de 50kg',
        'saco(s) de 40kg',
        'saco(s) de 25kg',
        'saco(s) de 20kg',
        'saco(s) de 15kg',
        'saco(s) de 10kg',
        'saco(s) de 5kg',
        'saco(s) de 1kg',

        // Peso
        'kg',
        'g',

        // Comprimento
        'metro(s)',
        'barra(s)',
        'rolo(s)',
        'tubo(s)',

        // Área
        'm²',

        // Volume
        'm³',
        'litro(s)',

        // Latas (tintas, impermeabilizantes)
        'lata(s)',
        'lata(s) de 18 litros',
        'lata(s) de 20 litros',
        'lata(s) de 5 litros',
        'lata(s) de 3,6 litros',
        'lata(s) de 2,5 litros',
        'lata(s) de 900 ml',

        // Baldes
        'balde(s) de 20 litros',
        'balde(s) de 18 litros',
        'balde(s) de 10 litros',
        'balde(s) de 5 litros',

        // Caixas / embalagens
        'caixa(s)',
        'pacote(s)',
        'fardo(s)',

        // Elétrica / hidráulica
        'rolo(s) de 100m',
        'rolo(s) de 50m',
        'rolo(s) de 25m',

        // Madeira / acabamento
        'chapa(s)',
        'placa(s)',
    ];

    unidadesParaComplementar = [
        'saco(s) de',
        'lata(s) de',
        'balde(s) de',
        'litro(s) de',
        'caixa(s) com',
        'pacote(s) com',
        'fardo(s) com',
        'rolo(s) de',
        'barra(s) de',
        'tubo(s) de',
        'chapa(s) de',
        'placa(s) de',
        'outro (especificar)',
    ];

    constructor(
        injector: Injector,
        public _solicitacaoService: SolicitacaoMaterialServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }


    ngOnInit(): void {
        if (this.id) {
            forkJoin([
                this._solicitacaoService.get(this.id),
                this._solicitacaoService.getEncarregadosComObras()
            ]).subscribe(([solicitacao, encarregados]) => {
                this.solicitacao = UpdateSolicitacaoMaterialDto.fromJS(solicitacao);

                this.materiais = (this.solicitacao.materiaisSolicitados ?? [])
                    .map(m => {
                        const mat = UpdateMaterialSolicitadoDto.fromJS(m) as MaterialSolicitadoUI;

                        // Se a unidade salva bate com uma unidade padrão
                        if (this.unidadesPadrao.includes(mat.unidade)) {
                            mat.unidadeSelecionada = mat.unidade;
                            mat.unidadeComplemento = null;
                        }
                        // Se for unidade com complemento
                        else {
                            const unidadeBase = this.unidadesParaComplementar.find(u =>
                                mat.unidade.startsWith(u)
                            );

                            if (unidadeBase) {
                                mat.unidadeSelecionada = unidadeBase;
                                mat.unidadeComplemento = mat.unidade.replace(unidadeBase, '').trim();
                            } else {
                                // fallback
                                mat.unidadeSelecionada = mat.unidade;
                                mat.unidadeComplemento = null;
                            }
                        }

                        return mat;
                    });

                this.resolucao = this.solicitacao.resolucao ?? '';

                this.encarregadosComObras = encarregados;

                if (this.solicitacao.encarregado) {
                    this.selectedEncarregado = this.encarregadosComObras
                        .find(e => e.id === this.solicitacao.encarregado!.id);
                }

                this.cd.detectChanges();
            });
        } else {
            this.loadEncarregadosComObras();
        }
    }


    loadEncarregadosComObras() {
        this._solicitacaoService.getEncarregadosComObras().subscribe(result => {
            this.encarregadosComObras = result;
        });
    }


    onEncarregadoChange() {
        if (this.selectedEncarregado) {
            this.solicitacao.encarregado = undefined;
            this.solicitacao.obra = undefined;
            this.solicitacao.encarregadoId = this.selectedEncarregado.id;
            this.solicitacao.obraId = this.selectedEncarregado.obraId;
        }
    }


    fecharSolicitacao(): void {
        if (!this.resolucao || this.resolucao.trim() === '') {
            this.notify.error('Informe a resolução antes de fechar a solicitação.');
            return;
        }

        this.solicitacao.resolucao = this.resolucao;
        this.solicitacao.status = SolicitacaoMaterialStatus._6;

        this._solicitacaoService.update(this.solicitacao).subscribe(() => {
            this.notify.info(this.l('SolicitacaoFechadaComSucesso'));
            this.bsModalRef.hide();
            this.onSave.emit();
        });
    }

    save(): void {
        this.materiais.forEach(m => {
            if (this.exigeComplemento(m.unidadeSelecionada)) {
                m.unidade = `${m.unidadeSelecionada} ${m.unidadeComplemento}`.trim();
            } else {
                m.unidade = m.unidadeSelecionada!;
            }
        });

        this.solicitacao.materiaisSolicitados = this.materiais;

        this._solicitacaoService.update(this.solicitacao).subscribe(() => {
            this.notify.info(this.l('SavedSuccessfully'));
            this.bsModalRef.hide();
            this.onSave.emit();
        }, () => {
            this.saving = false;
        });
    }


    adicionarMaterial() {
        const material = new UpdateMaterialSolicitadoDto() as MaterialSolicitadoUI;
        material.unidadeSelecionada = null;
        material.unidadeComplemento = null;

        this.materiais.push(material);
    }

    removerMaterial(index: number) {
        this.materiais.splice(index, 1);
    }

    exigeComplemento(unidade: string | null | undefined): boolean {
        if (!unidade) return false;

        return this.unidadesParaComplementar.includes(unidade);
    }

    get possuiMateriais(): boolean {
        return this.materiais.length > 0;
    }
}
