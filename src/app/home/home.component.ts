import { Component, Injector, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import {
    SolicitacaoMaterialDto,
    SolicitacaoMaterialServiceProxy
} from '../../shared/service-proxies/service-proxies';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { CommonModule } from '@node_modules/@angular/common';
import { CollapseModule } from 'ngx-bootstrap/collapse';

@Component({
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    animations: [appModuleAnimation()],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [LocalizePipe, CommonModule, CollapseModule],
})
export class HomeComponent extends AppComponentBase implements OnInit {
    ultimasSolicitacoes: SolicitacaoMaterialDto[] = [];
    collapseStates: boolean[] = [];

    constructor(
        injector: Injector,
        private _solicitacaoService: SolicitacaoMaterialServiceProxy,
        private cdr: ChangeDetectorRef,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.carregarUltimasSolicitacoes();
    }

    carregarUltimasSolicitacoes() {
        this._solicitacaoService
            .getAll(undefined, undefined, undefined, undefined, 0, 10)
            .subscribe(result => {
                this.ultimasSolicitacoes = result.items || [];
                this.collapseStates = this.ultimasSolicitacoes.map(() => false);
                this.cdr.markForCheck();
            });
    }

    toggleCollapse(index: number) {
        this.collapseStates[index] = !this.collapseStates[index];
    }

    formatarMateriais(materiais: { nome: string; quantidade: number }[] | undefined): string {
        if (!materiais || materiais.length === 0) return '-';
        return materiais.map(m => `${m.nome} (${m.quantidade})`).join(', ');
    }
}
