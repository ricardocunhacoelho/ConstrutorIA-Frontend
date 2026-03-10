import { CommonModule } from '@angular/common';
import { NgModule, ModuleWithProviders } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AppSessionService } from './session/app-session.service';
import { AppUrlService } from './nav/app-url.service';
import { AppAuthService } from './auth/app-auth.service';
import { AppRouteGuard } from './auth/auth-route-guard';
import { LocalizePipe } from '@shared/pipes/localize.pipe';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { Nl2brPipe } from '@shared/pipes/nl2br.pipe';
import { CpfCnpjPipe } from '@shared/pipes/cpf-cnpj.pipe';


import { AbpPaginationControlsComponent } from './components/pagination/abp-pagination-controls.component';
import { AbpValidationSummaryComponent } from './components/validation/abp-validation.summary.component';
import { AbpModalHeaderComponent } from './components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from './components/modal/abp-modal-footer.component';
import { LayoutStoreService } from './layout/layout-store.service';

import { BusyDirective } from './directives/busy.directive';
import { EqualValidator } from './directives/equal-validator.directive';

import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { TableModule } from 'primeng/table';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { FornecedorMultiselectComponent } from './components/select-fornecedor/fornecedor-multiselect.component';
import { ConfirmarPagamentoDialogComponent } from './components/confirmar-pagamento-dialog/confirmar-pagamento-dialog.component.';
import { EstornarLancamentoModalComponent } from './components/confirmar-pagamento-dialog/estornar-lancamento-modal/estornar-lancamento-modal.component';
import { ConversaModalComponent } from './components/conversa-modal/conversa-modal.component';

import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        NgxPaginationModule,
        FormsModule,
        ModalModule,
        BsDropdownModule,
        CollapseModule,
        TabsModule,
        TableModule,
        PaginatorModule,
        ProgressBarModule,
        AutoCompleteModule,
        AbpPaginationControlsComponent,
        AbpValidationSummaryComponent,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        LocalizePipe,
        TimeAgoPipe,
        Nl2brPipe,
        CpfCnpjPipe,
        BusyDirective,
        EqualValidator,
        FornecedorMultiselectComponent,
        ConfirmarPagamentoDialogComponent,
        EstornarLancamentoModalComponent,
        ConversaModalComponent,
        NgxMaskDirective,
        NgxMaskPipe,
    ],
    exports: [
        AbpPaginationControlsComponent,
        AbpValidationSummaryComponent,
        AbpModalHeaderComponent,
        AbpModalFooterComponent,
        LocalizePipe,
        TimeAgoPipe,
        Nl2brPipe,
        CpfCnpjPipe,
        BusyDirective,
        EqualValidator,
        FormsModule,
        NgxPaginationModule,
        ModalModule,
        BsDropdownModule,
        CollapseModule,
        TabsModule,
        TableModule,
        PaginatorModule,
        FornecedorMultiselectComponent,
        ConfirmarPagamentoDialogComponent,
        EstornarLancamentoModalComponent,
        ConversaModalComponent
    ],
    providers: [provideNgxMask()],
})
export class SharedModule {
    static forRoot(): ModuleWithProviders<SharedModule> {
        return {
            ngModule: SharedModule,
            providers: [
                AppSessionService,
                AppUrlService,
                AppAuthService,
                AppRouteGuard,
                LayoutStoreService
            ],
        };
    }
}
