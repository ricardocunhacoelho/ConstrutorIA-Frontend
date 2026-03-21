import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import {
    SolicitacaoMaterialServiceProxy,
    CreateSolicitacaoMaterialDto,
    EncarregadoComObraDto,
    SolicitacaoMaterialStatus,
    CreateMaterialSolicitadoDto
} from '../../../shared/service-proxies/service-proxies';

interface MaterialSolicitadoUI extends CreateMaterialSolicitadoDto {
    unidadeSelecionada?: string | null;
    unidadeComplemento?: string | null;
}

@Component({
    templateUrl: './create-solicitacao-material-dialog.component.html',
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
export class CreateSolicitacaoMaterialDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    solicitacao = new CreateSolicitacaoMaterialDto();
    materiais: MaterialSolicitadoUI[] = [];
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
        'unidades(s) de',
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


    encarregadosComObras: EncarregadoComObraDto[] = [];
    selectedEncarregado?: EncarregadoComObraDto;

    constructor(
        injector: Injector,
        public _solicitacaoService: SolicitacaoMaterialServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.materiais = [];
        this.loadEncarregadosComObras();
    }

    loadEncarregadosComObras() {
        this._solicitacaoService.getEncarregadosComObras().subscribe(result => {
            this.encarregadosComObras = result;
            this.cd.detectChanges();
        });
    }

    onEncarregadoChange() {
        if (this.selectedEncarregado) {
            this.solicitacao.encarregadoId = this.selectedEncarregado.id;
            this.solicitacao.obraId = this.selectedEncarregado.obraId;
        }
    }

    private exigeComplemento(unidade?: string): boolean {
        return this.unidadesParaComplementar.includes(unidade ?? '');
    }

    private isOutro(unidade?: string): boolean {
        return unidade === 'outro (especificar)';
    }

    save(): void {

        if (!this.solicitacao.descricao?.trim()) {
            this.notify.warn('Informe a descrição da solicitação.');
            return;
        }

        if (this.materiais.length === 0) {
            this.notify.warn('Adicione ao menos um material.');
            return;
        }

        this.materiais.forEach(m => {
            if (this.isOutro(m.unidadeSelecionada)) {
                m.unidade = m.unidadeComplemento?.trim();
            }
            else if (this.exigeComplemento(m.unidadeSelecionada)) {
                m.unidade = `${m.unidadeSelecionada} ${m.unidadeComplemento}`.trim();
            }
            else {
                m.unidade = m.unidadeSelecionada;
            }

            delete (m as any).unidadeSelecionada;
            delete (m as any).unidadeComplemento;
        });

        this.solicitacao.materiaisSolicitados = this.materiais;
        this.saving = true;

        this._solicitacaoService.create(this.solicitacao).subscribe(() => {
            this.notify.info(this.l('SolicitacaoCriadaComSucesso'));
            this.bsModalRef.hide();
            this.onSave.emit();
        }, () => this.saving = false);
    }

    adicionarMaterial() {
        const material = new CreateMaterialSolicitadoDto() as MaterialSolicitadoUI;
        material.unidadeSelecionada = null;
        material.unidadeComplemento = null;

        this.materiais.push(material);
    }

    removerMaterial(index: number) {
        this.materiais.splice(index, 1);
    }

    get possuiMateriais(): boolean {
        return this.materiais.length > 0;
    }

}
