import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'sidebar-logo',
    templateUrl: './sidebar-logo.component.html',
    styleUrls: ['./sidebar-logo.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterLink],
})
export class SidebarLogoComponent { }
