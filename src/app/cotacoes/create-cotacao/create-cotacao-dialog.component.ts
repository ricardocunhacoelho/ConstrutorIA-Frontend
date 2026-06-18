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
import { BsModalService } from 'ngx-bootstrap/modal';
import { SelecionarEnderecoDialogComponent } from '../list-cotacoes//selecionar-endereco-dialog/selecionar-endereco-dialog.component';

@Component({
    templateUrl: './create-cotacao-dialog.component.html',
    standalone: true,
    styleUrls: ['./create-cotacao-dialog.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        TabsetComponent,
        TabDirective,
        LocalizePipe,
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

    mostrarAlerta = true;

    constructor(
        injector: Injector,
        public _cotacaoService: CotacaoServiceProxy,
        public _solicitacaoService: SolicitacaoMaterialServiceProxy,
        public bsModalRef: BsModalRef,
        private cd: ChangeDetectorRef,
        private _modalService: BsModalService
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.mostrarAlerta = true;

        if (this.solicitacaoId) {
            this.carregarSolicitacao();
        } else {
            this.materiais = [];
        }

        this.carregarFornecedores();
    }


    carregarSolicitacao(): void {
        abp.ui.setBusy();
        this._solicitacaoService.get(this.solicitacaoId!).subscribe((result) => {
            this.solicitacao = result;
            this.cotacao.solicitacaoMaterialId = result.id;
            this.materiais = result.materiaisSolicitados.map(m => {
                const mat = new CreateMaterialCotadoDto();
                mat.nome = m.nome;
                mat.quantidade = String(m.quantidade);
                mat.unidade = m.unidade;
                return mat;
            });
            this.cd.detectChanges();
            abp.ui.clearBusy();
        });
    }

    carregarFornecedores(): void {
        this._cotacaoService.getFornecedoresLookup().subscribe((result) => {
            this.fornecedoresDisponiveis = result;
            this.cd.detectChanges();
            abp.ui.clearBusy();
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

    async save(): Promise<void> {
        if (!this.validar()) {
            return;
        }

        const enderecoResult = await this.abrirDialogEndereco();
        if (!enderecoResult) {
            return;
        }

        this.saving = true;

        const cotacoes = this.montarCotacoes(enderecoResult);

        this.salvarCotacoes(cotacoes);
    }

    private validar(): boolean {
        if (!this.fornecedoresSelecionados.length) {
            this.notify.warn('Selecione ao menos um fornecedor');
            return false;
        }
        return true;
    }

    private montarCotacoes(enderecoResult: any): CreateCotacaoDto[] {
        return this.fornecedoresSelecionados.map(fornecedor => {

            const nova = new CreateCotacaoDto();

            nova.fornecedorId = fornecedor.id;
            nova.solicitacaoMaterialId = this.cotacao.solicitacaoMaterialId;
            nova.observacaoInterna = this.cotacao.observacaoInterna;
            nova.observacaoFornecedor = this.cotacao.observacaoFornecedor;
            nova.materiaisCotados = this.materiais;
            nova.obraId = this.solicitacao?.obraId;

            if (enderecoResult?.tipoEntrega === 'OBRA') {
                nova.enderecoEntregaId = enderecoResult.enderecoObraId;
            } else if (enderecoResult?.tipoEntrega === 'OUTRO') {
                nova.enderecoEntrega = enderecoResult.endereco;
            } else if (enderecoResult?.tipoEntrega === 'RETIRADA') {
                nova.retiradaNoFornecedor = true;
            }

            return nova;
        });
    }

    private salvarCotacoes(cotacoes: CreateCotacaoDto[]): void {
        abp.ui.setBusy();
        this.saving = true;
        this._cotacaoService.createMultiple(cotacoes)
            .subscribe(() => {
                this.notify.info('Cotações criadas com sucesso');
                this.bsModalRef.hide();
                this.onSave.emit();
                this.saving = false;
                abp.ui.clearBusy();
            }, () => {
                this.saving = false;
                abp.ui.clearBusy();
            });
    }


    isFornecedorSelecionado(fornecedor: SimpleLookupDto): boolean {
        return this.fornecedoresSelecionados.some(f => f.id === fornecedor.id);
    }

    private abrirDialogEndereco(): Promise<any> {
        return new Promise(resolve => {

            const endereco = this.solicitacao?.obra?.endereco;

            const enderecoFormatado = endereco
                ? `${endereco.rua}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}, CEP: ${endereco.cep}`
                : '';

            const modalRef = this._modalService.show(
                SelecionarEnderecoDialogComponent,
                {
                    class: 'modal-md',
                    backdrop: 'static',
                    keyboard: false
                }
            );

            modalRef.content.enderecoObraId = endereco?.id;
            modalRef.content.enderecoObraFormatado = enderecoFormatado;

            const oldHide = modalRef.hide;

            modalRef.hide = () => {
                const content = modalRef.content;
                oldHide.apply(modalRef);

                if (!content.confirmado) {
                    resolve(null);
                    return;
                }

                resolve({
                    tipoEntrega: content.tipoEntrega,
                    endereco: content.tipoEntrega === 'OUTRO'
                        ? content.endereco
                        : null,
                    enderecoObraId: content.tipoEntrega === 'OBRA'
                        ? content.enderecoObraId
                        : null
                });
            };
        });
    }

}
