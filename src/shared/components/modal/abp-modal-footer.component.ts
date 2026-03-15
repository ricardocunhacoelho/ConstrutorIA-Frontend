import { Component, input, output, ChangeDetectionStrategy, Injector } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import { CommonModule } from '@node_modules/@angular/common';

@Component({
    selector: 'abp-modal-footer',
    templateUrl: './abp-modal-footer.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [CommonModule]
})
export class AbpModalFooterComponent extends AppComponentBase {
    cancelLabel = input(this.l('Cancel'));
    cancelDisabled = input<boolean>();
    saveLabel = input(this.l('Save'));
    saveDisabled = input<boolean>();
    showSaveButton = input<boolean>();

    onCancelClick = output<void>();
    onSaveClick = output<void>();

    constructor(injector: Injector) {
        super(injector);
    }
}