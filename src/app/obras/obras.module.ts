import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { CreateObraDialogComponent } from './create-obra/create-obra-dialog.component';
import { FinanceiroObraDialogComponent } from './financeiro-obra/financeiro-obra-dialog.component';
import { CreateLancamentoDialogComponent } from './financeiro-obra/create-lancamento-dialog/create-lancamento-dialog.component';
import { ViewLancamentoDialogComponent } from './financeiro-obra/view-lancamento-dialog/view-lancamento-dialog.component';
import { EditObraDialogComponent } from './edit-obra/edit-obra-dialog.component';
import { ObrasRoutingModule } from './obras-routing.module';
import { ObrasComponent } from './obras.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        ObrasRoutingModule,
        CommonModule,
        ObrasComponent,
        EditObraDialogComponent,
        CreateObraDialogComponent,
        FinanceiroObraDialogComponent,
        CreateLancamentoDialogComponent,
        ViewLancamentoDialogComponent
    ],
})
export class ObrasModule {}
