import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabsetComponent, TabDirective } from 'ngx-bootstrap/tabs';
import { AbpModalHeaderComponent } from '../../components/modal/abp-modal-header.component';
import { AbpModalFooterComponent } from '../../components/modal/abp-modal-footer.component';
import { AbpValidationSummaryComponent } from '../../components/validation/abp-validation.summary.component';
import { LocalizePipe } from '@shared/pipes/localize.pipe';

@Component({
    selector: 'app-fornecedor-multiselect',
    templateUrl: './fornecedor-multiselect.component.html',
    styleUrls: ['./fornecedor-multiselect.component.scss'],
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
export class FornecedorMultiselectComponent {
    @Input() fornecedoresDisponiveis: any[] = [];
    @Input() fornecedoresSelecionados: any[] = [];

    @Output() fornecedoresChange = new EventEmitter<any[]>();

    searchTerm = '';

    get fornecedoresFiltrados() {
        return this.fornecedoresDisponiveis.filter(f =>
            f.nome.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    }

    toggleFornecedor(fornecedor: any) {
        const index = this.fornecedoresSelecionados.findIndex(f => f.id === fornecedor.id);

        if (index >= 0) {
            this.fornecedoresSelecionados.splice(index, 1);
        } else {
            this.fornecedoresSelecionados.push(fornecedor);
        }

        this.fornecedoresChange.emit(this.fornecedoresSelecionados);
    }

    removerFornecedor(fornecedor: any) {
        this.fornecedoresSelecionados = this.fornecedoresSelecionados.filter(f => f.id !== fornecedor.id);
        this.fornecedoresChange.emit(this.fornecedoresSelecionados);
    }

    isSelecionado(fornecedor: any): boolean {
        return this.fornecedoresSelecionados.some(f => f.id === fornecedor.id);
    }
}
