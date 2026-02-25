import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { CreateEnderecoDto } from '../../../../shared/service-proxies/service-proxies';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-selecionar-endereco-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './selecionar-endereco-dialog.component.html',
    styleUrls: ['./selecionar-endereco-dialog.component.scss']
})
export class SelecionarEnderecoDialogComponent {

    selecionarFormaPagamento = false;

    abaAtiva: 'ENDERECO' | 'PAGAMENTO' = 'ENDERECO';

    tipoEntrega: 'OBRA' | 'OUTRO' | 'RETIRADA' = 'OBRA';
    endereco: CreateEnderecoDto = new CreateEnderecoDto();
    enderecoObraFormatado: string;
    enderecoObraId: string;

    formaPagamento?: 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO' | 'FATURADO';

    confirmado = false;

    constructor(public bsModalRef: BsModalRef) { }


    confirmar() {

        if (this.tipoEntrega === 'OUTRO') {
            const { rua, numero, bairro, cidade, uf, cep } = this.endereco;
            if (!rua || !numero || !bairro || !cidade || !uf || !cep) {
                abp.notify.warn('Preencha todos os campos do endereço antes de continuar.');
                return;
            }
        }

        if (this.selecionarFormaPagamento && this.abaAtiva === 'ENDERECO') {
            this.abaAtiva = 'PAGAMENTO';
            return;
        }

        if (this.selecionarFormaPagamento && !this.formaPagamento) {
            abp.notify.warn('Selecione a forma de pagamento.');
            return;
        }

        this.confirmado = true;
        this.bsModalRef.hide();
    }


    cancelar() {
        this.confirmado = false;
        this.bsModalRef.hide();
    }
}
