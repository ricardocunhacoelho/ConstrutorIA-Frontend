import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { CreateEnderecoDto } from '../../../../shared/service-proxies/service-proxies';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BsModalService } from 'ngx-bootstrap/modal';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { PrimeTemplate } from 'primeng/api';

import { LocalizePipe } from '@shared/pipes/localize.pipe';


@Component({
    selector: 'app-selecionar-endereco-dialog',
    templateUrl: './selecionar-endereco-dialog.component.html',
    styleUrls: ['./selecionar-endereco-dialog.component.scss'],
    standalone: true,
    imports: [LocalizePipe, CommonModule, FormsModule, TableModule, PrimeTemplate, NgIf, PaginatorModule],
})
export class SelecionarEnderecoDialogComponent {

    usarEnderecoObra = true;
    endereco: CreateEnderecoDto = new CreateEnderecoDto();

    enderecoObraFormatado: string;
    enderecoObraId: string;

    confirmado = false;

    constructor(public bsModalRef: BsModalRef) { }

    confirmar() {
        if (!this.usarEnderecoObra) {

            const { rua, numero, bairro, cidade, uf, cep } = this.endereco;

            if (!rua || !numero || !bairro || !cidade || !uf || !cep) {

                abp.notify.warn('Preencha todos os campos do endereço antes de continuar.');
                return;
            }
        }

        this.confirmado = true;
        console.log(this.enderecoObraId);
        this.bsModalRef.hide();
    }

    cancelar() {
        this.confirmado = false;
        this.bsModalRef.hide();
    }
}


