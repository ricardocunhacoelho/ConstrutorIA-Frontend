import { Component, Injector, OnInit, EventEmitter, Output } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';

import { ProblemaImpedimentoServiceProxy, ResolverProblemaImpedimentoDto } from '../../../shared/service-proxies/service-proxies';

@Component({
    templateUrl: './resolve-problema-impedimento-dialog.component.html',
    styleUrls: ['./resolve-problema-impedimento-dialog.component.scss'],  // <-- adicione esta linha
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        LocalizePipe
    ]
})
export class ResolveProblemaImpedimentoDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    id: string;
    resolucao: string = '';
    saving = false;

    constructor(
        injector: Injector,
        public _problemaService: ProblemaImpedimentoServiceProxy,
        public bsModalRef: BsModalRef
    ) {
        super(injector);
    }

    ngOnInit(): void { }

    save(): void {
        if (!this.resolucao) {
            this.notify.warn('Informe a resolução do problema.');
            return;
        }

        this.saving = true;
        const input = new ResolverProblemaImpedimentoDto();
        input.id = this.id;
        input.resolucao = this.resolucao;

        this._problemaService.resolver(input).subscribe({
            next: () => {
                this.notify.success('Problema resolvido com sucesso!');
                this.bsModalRef.hide();
                this.onSave.emit();
            },
            error: (err) => {
                this.saving = false;
                this.notify.error('Erro ao resolver problema.');
                console.error(err);
            }
        });
    }

    close(): void {
        this.bsModalRef.hide();
    }
}