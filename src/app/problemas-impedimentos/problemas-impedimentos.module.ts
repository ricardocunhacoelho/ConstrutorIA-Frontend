import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { CreateProblemaImpedimentoDialogComponent } from './create-problema-impedimento/create-problema-impedimento-dialog.component';
import { EditProblemaImpedimentoDialogComponent } from './edit-problema-impedimento/edit-problema-impedimento-dialog.component';
import { ViewProblemaImpedimentoDialogComponent } from './view-problema-impedimento/view-problema-impedimento-dialog.component';
import { ProblemasImpedimentosRoutingModule } from './problemas-impedimentos-routing.module';
import { ProblemasImpedimentosComponent } from './problemas-impedimentos.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        ProblemasImpedimentosRoutingModule,
        CommonModule,
        ProblemasImpedimentosComponent,
        CreateProblemaImpedimentoDialogComponent,
        EditProblemaImpedimentoDialogComponent,
        ViewProblemaImpedimentoDialogComponent
    ],
})
export class ProblemasImpedimentosModule {}