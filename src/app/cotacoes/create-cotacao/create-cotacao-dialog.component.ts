import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import {
    SolicitacaoMaterialServiceProxy,
    SolicitacaoMaterialDto,
    CreateCotacaoDto,
    CreateMaterialCotadoDto,
    CotacaoServiceProxy,
    SimpleLookupDto
} from '../../../shared/service-proxies/service-proxies';
import { SharedModule } from '@shared/shared.module';

@Component({
    templateUrl: './create-cotacao-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        AbpValidationSummaryComponent,
        TabsetComponent,
        TabDirective,
        LocalizePipe,
        NgIf,
        SharedModule
    ]
})
export class CreateCotacaoDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    cotacao = new CreateCotacaoDto();
    materiais: CreateMaterialCotadoDto[] = [];
    fornecedoresSelecionados: SimpleLookupDto[] = [];
    fornecedoresDisponiveis: SimpleLookupDto[] = [];

    solicitacaoId?: string;
    solicitacao?: SolicitacaoMaterialDto;

    constructor(
        injector: Injector,
        public _cotacaoService: CotacaoServiceProxy,
        public _solicitacaoService: SolicitacaoMaterialServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        if (this.solicitacaoId) {
            this.carregarSolicitacao();
        } else {
            this.materiais = [];
        }

        this.carregarFornecedores();
    }

    carregarSolicitacao(): void {
        this._solicitacaoService.get(this.solicitacaoId!).subscribe((result) => {
            this.solicitacao = result;
            this.cotacao.solicitacaoMaterialId = result.id;
            this.materiais = result.materiaisSolicitados.map(m => {
                const mat = new CreateMaterialCotadoDto();
                mat.nome = m.nome;
                mat.quantidade = m.quantidade;
                mat.unidade = m.unidade;
                return mat;
            });
            this.cd.detectChanges();
        });
    }

    carregarFornecedores(): void {
        this._cotacaoService.getFornecedoresLookup().subscribe((result) => {
            this.fornecedoresDisponiveis = result;
            this.cd.detectChanges();
        });
    }

    adicionarMaterial() {
        this.materiais.push(new CreateMaterialCotadoDto());
    }

    removerMaterial(index: number) {
        this.materiais.splice(index, 1);
    }

    toggleFornecedor(fornecedor: SimpleLookupDto) {
        const idx = this.fornecedoresSelecionados.findIndex(f => f.id === fornecedor.id);
        if (idx >= 0) {
            this.fornecedoresSelecionados.splice(idx, 1);
        } else {
            this.fornecedoresSelecionados.push(fornecedor);
        }
    }

    save(): void {
        if (!this.fornecedoresSelecionados.length) {
            this.notify.warn('Selecione ao menos um fornecedor');
            return;
        }

        this.saving = true;

        const cotacoesParaSalvar = this.fornecedoresSelecionados.map(fornecedor => {
            const nova = new CreateCotacaoDto();
            nova.fornecedorId = fornecedor.id;
            nova.solicitacaoMaterialId = this.cotacao.solicitacaoMaterialId;
            nova.observacaoInterna = this.cotacao.observacaoInterna;
            nova.observacaoFornecedor = this.cotacao.observacaoFornecedor;
            nova.materiaisCotados = this.materiais;
            nova.obraId = this.solicitacao?.obraId;
            return nova;
        });

        this._cotacaoService.createMultiple(cotacoesParaSalvar)
            .subscribe(() => {
                this.notify.info('Cotações criadas com sucesso');
                this.bsModalRef.hide();
                this.onSave.emit();
            }, () => {
                this.saving = false;
            });
    }

    isFornecedorSelecionado(fornecedor: SimpleLookupDto): boolean {
        return this.fornecedoresSelecionados.some(f => f.id === fornecedor.id);
    }
}
