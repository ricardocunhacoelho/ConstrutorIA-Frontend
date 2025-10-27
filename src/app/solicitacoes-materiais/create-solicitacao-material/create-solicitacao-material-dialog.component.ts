import { Component, Injector, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../../shared/components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../../shared/components/modal/abp-modal-footer.component';
import { AbpValidationSummaryComponent } from '../../../shared/components/validation/abp-validation.summary.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { AppComponentBase } from '@shared/app-component-base';
import { 
    SolicitacaoMaterialServiceProxy, 
    CreateSolicitacaoMaterialDto, 
    UpdateMaterialSolicitadoDto, 
    EncarregadoComObraDto, 
    SolicitacaoMaterialStatus, 
    CreateMaterialSolicitadoDto
} from '../../../shared/service-proxies/service-proxies';

@Component({
    templateUrl: './create-solicitacao-material-dialog.component.html',
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
        NgIf
    ]
})
export class CreateSolicitacaoMaterialDialogComponent extends AppComponentBase implements OnInit {
    @Output() onSave = new EventEmitter<any>();

    saving = false;
    solicitacao = new CreateSolicitacaoMaterialDto();
    materiais: CreateMaterialSolicitadoDto[] = [];

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

    save(): void {
        this.solicitacao.materiaisSolicitados = this.materiais;
        this.solicitacao.status = SolicitacaoMaterialStatus.ABERTA;

        this.saving = true;

        this._solicitacaoService.create(this.solicitacao).subscribe(() => {
            this.notify.info(this.l('SolicitacaoCriadaComSucesso'));
            this.bsModalRef.hide();
            this.onSave.emit();
        }, () => {
            this.saving = false;
        });
    }

    adicionarMaterial() {
        this.materiais.push(new CreateMaterialSolicitadoDto());
    }

    removerMaterial(index: number) {
        this.materiais.splice(index, 1);
    }
}
