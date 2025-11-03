import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { CreateFornecedorDialogComponent } from './create-fornecedor/create-fornecedor-dialog.component';
import { EditFornecedorDialogComponent } from './edit-fornecedor/edit-fornecedor-dialog.component';
import { FornecedoresRoutingModule } from './fornecedores-routing.module';
import { FornecedoresComponent } from './fornecedores.component';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [
        SharedModule,
        FornecedoresRoutingModule,
        CommonModule,
        FornecedoresComponent,
        EditFornecedorDialogComponent,
        CreateFornecedorDialogComponent,
    ],
})
export class FornecedoresModule {}
