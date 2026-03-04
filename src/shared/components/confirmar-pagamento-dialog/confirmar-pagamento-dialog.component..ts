import { Component, OnInit, EventEmitter, Output } from "@angular/core";
import { CompraDto, CompraServiceProxy, CreateObraLancamentoFinanceiroDto, FormaPagamento, NaturezaLancamento, ObraLancamentoFinanceiroDto, ObraLancamentoFinanceiroServiceProxy, ObraLancamentoTipo, PedidoCompraDto, PedidoCompraServiceProxy, SimpleLookupDto, UpdateCompraDto } from "../../service-proxies/service-proxies";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import {
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import moment from "moment";
import { NgxMaskDirective } from 'ngx-mask';
import { EstornarLancamentoModalComponent } from "./estornar-lancamento-modal/estornar-lancamento-modal.component";

@Component({
  selector: 'app-confirmar-pagamento-dialog',
  templateUrl: './confirmar-pagamento-dialog.component.html',
  styleUrls: ['./confirmar-pagamento-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    FormsModule,
    TableModule,
    PaginatorModule,
    NgxMaskDirective
  ],
})
export class ConfirmarPagamentoDialogComponent implements OnInit {

  @Output() onConfirmado = new EventEmitter<void>();
  @Input() modo: 'confirmar' | 'visualizar' = 'confirmar';
  @Input() lancamentoId?: string;
  editandoMateriais = false;

  compraId!: string;
  compra!: UpdateCompraDto;

  obra: SimpleLookupDto;
  fornecedor: SimpleLookupDto;

  valorFrete = 0;
  valorDesconto = 0;
  valorPago = 0;
  formaPagamentoSelecionada!: FormaPagamento;
  teste: CreateObraLancamentoFinanceiroDto

  motivoEstorno?: string;
  dataEstorno?: moment.Moment;
  estornadoPor?: string;

  statusLancamento?: number;

  carregando = true;

  constructor(
    public bsModalRef: BsModalRef,
    private _compraService: CompraServiceProxy,
    private _obraLancamentoFinanceiroService: ObraLancamentoFinanceiroServiceProxy,
    private _modalService: BsModalService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {

    if (this.modo === 'confirmar' && this.compraId) {
      this.carregarCompra();
    }

    if (this.modo === 'visualizar' && this.lancamentoId) {
      this.carregarLancamento();
    }
  }


  carregarCompra() {
    abp.ui.setBusy();

    this._compraService.get(this.compraId).subscribe(compra => {

      this.compra = UpdateCompraDto.fromJS(compra);

      this.valorFrete = compra.valorFrete || 0;
      this.valorDesconto = compra.valorDesconto || 0;
      this.formaPagamentoSelecionada = compra.formaDePagamento;
      this.obra = compra.obra;
      this.fornecedor = compra.fornecedor;

      this.calcularValorPago();

      this.carregando = false;
      abp.ui.clearBusy();

      this.cdr.detectChanges();
    });
  }

  carregarLancamento() {
    abp.ui.setBusy();

    this._obraLancamentoFinanceiroService
      .get(this.lancamentoId!)
      .subscribe(lancamento => {

        this.preencherLancamento(lancamento);

        this.carregando = false;
        abp.ui.clearBusy();

        this.cdr.detectChanges();
      });
  }

  preencherLancamento(lancamento: ObraLancamentoFinanceiroDto) {
    this.valorFrete = lancamento.frete || 0;
    this.valorDesconto = lancamento.desconto || 0;
    this.valorPago = lancamento.valorPago;
    this.formaPagamentoSelecionada = lancamento.formaDePagamento;

    this.statusLancamento = lancamento.status;

    this.statusLancamento = lancamento.status;

    this.motivoEstorno = lancamento.motivoEstorno;
    this.dataEstorno = lancamento.dataEstorno ? moment(lancamento.dataEstorno) : undefined;
    this.estornadoPor = lancamento.estornadoPorUser?.nome ?? undefined;

    this.obra = lancamento.obra;
    this.compra = UpdateCompraDto.fromJS(lancamento.compra);
    this.fornecedor = lancamento.compra.fornecedor;
  }



  calcularValorMateriais(): number {
    if (!this.compra?.materiaisComprados) return 0;

    return this.compra.materiaisComprados
      .reduce((total, m) => total + (m.precoTotal || 0), 0);
  }

  calcularValorPago() {
    const totalMateriais = this.calcularValorMateriais();
    this.valorPago = totalMateriais + this.valorFrete - this.valorDesconto;
  }

  confirmar() {
    abp.ui.setBusy();

    if (this.formaPagamentoSelecionada === undefined || this.formaPagamentoSelecionada === null) {
      abp.notify.warn('Selecione a forma de pagamento utilizada.');
      abp.ui.clearBusy();

      return;
    }

    if (this.valorPago <= 0) {
      abp.notify.warn('Informe um valor pago válido.');
      abp.ui.clearBusy();
      return;
    }

    const lancamento = new CreateObraLancamentoFinanceiroDto();
    lancamento.obraId = this.obra.id;
    lancamento.compraId = this.compra.id;
    lancamento.descricao = `Compra de material - ${this.fornecedor.nome}`;
    lancamento.valorPago = this.valorPago;
    lancamento.desconto = this.valorDesconto;
    lancamento.frete = this.valorFrete;
    lancamento.natureza = NaturezaLancamento._1; // Saída
    lancamento.tipo = ObraLancamentoTipo._0; // CompraMaterial
    lancamento.formaDePagamento = this.formaPagamentoSelecionada;
    lancamento.dataLancamento = moment();
    lancamento.fornecedorId = this.fornecedor.id;

    lancamento.compra = UpdateCompraDto.fromJS(this.compra);

    this._obraLancamentoFinanceiroService
      .create(lancamento)
      .subscribe({
        next: () => {
          abp.notify.success('Pagamento confirmado e lançamento financeiro registrado.');

          this.onConfirmado.emit();
          abp.ui.clearBusy();

          this.bsModalRef.hide();
        },
        error: () => {
          abp.ui.clearBusy();

          abp.notify.error('Erro ao lançar custo na obra.');
        }
      });
  }

  get somenteLeitura(): boolean {
    return this.modo === 'visualizar';
  }

  toggleEdicaoMateriais() {
    this.editandoMateriais = !this.editandoMateriais;
  }

  atualizarItem(item: any) {
    item.precoTotal = (item.quantidade || 0) * (item.precoItem || 0);
    this.calcularValorPago();
  }

  estornar() {

    if (!this.lancamentoId) return;

    const modalRef = this._modalService.show(
      EstornarLancamentoModalComponent,
      { class: 'modal-md' }
    );

    modalRef.content.onConfirm.subscribe((motivo: string) => {

      abp.ui.setBusy();

      const dto: any = {
        id: this.lancamentoId,
        motivo: motivo
      };

      this._obraLancamentoFinanceiroService
        .estornar(dto)
        .subscribe({
          next: (dto: ObraLancamentoFinanceiroDto) => {

            abp.notify.success('Lançamento estornado com sucesso.');

            this.preencherLancamento(dto);

            this.onConfirmado.emit();

            abp.ui.clearBusy();

            this.cdr.detectChanges();
          },
          error: () => {
            abp.ui.clearBusy();
            abp.notify.error('Erro ao estornar lançamento.');
          }
        });
    });

  }

  cancelar() {
    this.bsModalRef.hide();
  }
}
