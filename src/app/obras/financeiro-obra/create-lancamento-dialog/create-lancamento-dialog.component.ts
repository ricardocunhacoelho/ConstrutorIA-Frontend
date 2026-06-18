import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { AppComponentBase } from '@shared/app-component-base';
import {
    ObraLancamentoFinanceiroServiceProxy,
    CreateObraLancamentoFinanceiroDto,
    EnumServiceProxy,
    EnumValueDto,
    SimpleLookupDto,
    FornecedorServiceProxy
} from '@shared/service-proxies/service-proxies';
import { finalize } from 'rxjs/operators';
import moment from 'moment';
import { CommonModule } from '@node_modules/@angular/common';
import { FormsModule } from '@node_modules/@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
    templateUrl: './create-lancamento-dialog.component.html',
    styleUrls: ['./create-lancamento-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
    ]
})
export class CreateLancamentoDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    lancamento = new CreateObraLancamentoFinanceiroDto();
    obraId: string;
    obraNome: string;

    naturezas: EnumValueDto[] = [];
    tipos: EnumValueDto[] = [];
    formasPagamento: EnumValueDto[] = [];

    // Fornecedores
    fornecedores: SimpleLookupDto[] = [];

    dataLancamentoStr: string;

    constructor(
        injector: Injector,
        public bsModalRef: BsModalRef,
        private _obraLancamentoFinanceiroService: ObraLancamentoFinanceiroServiceProxy,
        private _fornecedorService: FornecedorServiceProxy,
        private cd: ChangeDetectorRef,
        private _enumService: EnumServiceProxy
    ) {
        super(injector);
    }

    ngOnInit(): void {
        abp.ui.setBusy();

        this.lancamento.obraId = this.obraId;
        this.lancamento.dataLancamento = moment();
        this.dataLancamentoStr = moment().format('YYYY-MM-DD');
        this.lancamento.natureza = 1;
        this.lancamento.valorPago = 0;
        this.lancamento.frete = 0;
        this.lancamento.desconto = 0;

        forkJoin({
            naturezas: this._enumService.getNaturezasLancamento(),
            tipos: this._enumService.getTiposLancamento(),
            formasPagamento: this._enumService.getFormasPagamento(),
            fornecedores: this._fornecedorService.getForSelect()
        }).subscribe({
            next: (result) => {
                this.naturezas = result.naturezas;
                this.tipos = result.tipos;
                this.formasPagamento = result.formasPagamento;
                this.fornecedores = result.fornecedores;

                const outro = this.tipos.find(t => t.value === 10);
                if (outro) {
                    this.lancamento.tipo = outro.value;
                }

                const pix = this.formasPagamento.find(f => f.value === 1);
                if (pix) {
                    this.lancamento.formaDePagamento = pix.value;
                }

                if (this.naturezas?.length && this.tipos?.length && this.formasPagamento?.length && this.fornecedores?.length) {
                    this.cd.detectChanges();
                    abp.ui.clearBusy();
                }
            },
            error: (error) => {
                console.error('Erro ao carregar dados:', error);
                this.notify.error('Erro ao carregar dados necessários');
                abp.ui.clearBusy();
            }
        });
    }

    onDataChange(data: string): void {
        this.dataLancamentoStr = data;
        this.lancamento.dataLancamento = moment(data, 'YYYY-MM-DD');
    }

    salvar(): void {
        abp.ui.setBusy();

        this.saving = true;

        if (this.dataLancamentoStr) {
            this.lancamento.dataLancamento = moment(this.dataLancamentoStr, 'YYYY-MM-DD');
        }

        this.lancamento.notaFria = true;

        this._obraLancamentoFinanceiroService
            .create(this.lancamento)
            .pipe(finalize(() => {
                this.saving = false;
                abp.ui.clearBusy();
            }))
            .subscribe({
                next: (result) => {
                    this.notify.success('Lançamento criado com sucesso!');
                    this.bsModalRef.hide();
                    this.onSave.emit(result);
                },
                error: (error) => {
                    this.notify.error('Erro ao criar lançamento');
                }
            });
    }

    getTitulo(): string {
        return this.lancamento.natureza === 0 ? 'Nova Receita' : 'Nova Despesa';
    }

    getCorTitulo(): string {
        return this.lancamento.natureza === 0 ? 'receita' : 'despesa';
    }

    getDescricaoNatureza(value: number): string {
        return this.naturezas.find(n => n.value === value)?.description || '';
    }

    getDescricaoTipo(value: number): string {
        return this.tipos.find(t => t.value === value)?.description || '';
    }
}