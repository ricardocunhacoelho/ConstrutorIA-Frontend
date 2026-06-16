import { Component, Injector, OnInit, ChangeDetectorRef } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import { Router, RouterEvent, NavigationEnd, RouterLink } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { MenuItem } from '@shared/layout/menu-item';
import { NgTemplateOutlet } from '@angular/common';
import { CollapseDirective } from 'ngx-bootstrap/collapse';

@Component({
    selector: 'sidebar-menu',
    templateUrl: './sidebar-menu.component.html',
    styleUrls: ['./sidebar-menu.component.scss'],
    standalone: true,
    imports: [NgTemplateOutlet, RouterLink, CollapseDirective],
})
export class SidebarMenuComponent extends AppComponentBase implements OnInit {
    menuItems: MenuItem[];
    menuItemsMap: { [key: number]: MenuItem } = {};
    activatedMenuItems: MenuItem[] = [];
    routerEvents: BehaviorSubject<RouterEvent> = new BehaviorSubject(undefined);
    homeRoute = '/app/about';

    constructor(
        injector: Injector,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.menuItems = this.getMenuItems();
        this.patchMenuItems(this.menuItems);

        this.activateMenuItems(this.router.url !== '/' ? this.router.url : this.homeRoute);

        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                const currentUrl = event.urlAfterRedirects !== '/' ? event.urlAfterRedirects : this.homeRoute;
                this.activateMenuItems(currentUrl);
                this.cdr.detectChanges();
            }
        });
    }

    getMenuItems(): MenuItem[] {
        return [
            new MenuItem(this.l('HomePage'), '/app/home', 'fas fa-home'),
            new MenuItem(this.l('Obras'), '/app/obras', 'fas fa-building'),
            new MenuItem(this.l('Fornecedores'), '/app/fornecedores', 'fa fa-truck'),
            new MenuItem(this.l('Tarefas'), '', 'fas fa-tasks', '', [
                new MenuItem(this.l('Tarefas Obras'), '/app/tarefas', 'fa-solid fa-hammer'),
                new MenuItem(this.l('Tarefas Internas'), '/app/escritorio-tarefas', 'fa-solid fa-stapler'),
            ]),
            new MenuItem(this.l('Solicitações Materiais'), '/app/solicitacoes-materiais', 'fa fa-shopping-bag'),
            new MenuItem(this.l('Problemas/Impedimentos'), '/app/problemas-impedimentos', 'fa fa-exclamation-triangle'),
            new MenuItem(this.l('Roles'), '/app/roles', 'fas fa-theater-masks', 'Pages.Roles'),
            new MenuItem(this.l('Users'), '/app/users', 'fas fa-users', 'Pages.Users'),
            new MenuItem(this.l('Tenants'), '/app/tenants', 'fas fa-building', 'Pages.Tenants'),
        ];
    }


    patchMenuItems(items: MenuItem[], parentId?: number): void {
        items.forEach((item: MenuItem, index: number) => {
            item.id = parentId ? Number(parentId + '' + (index + 1)) : index + 1;
            if (parentId) {
                item.parentId = parentId;
            }
            if (parentId || item.children) {
                this.menuItemsMap[item.id] = item;
            }
            if (item.children) {
                this.patchMenuItems(item.children, item.id);
            }
        });
    }

    activateMenuItems(url: string): void {
        this.deactivateMenuItems(this.menuItems);
        this.activatedMenuItems = [];
        const foundedItems = this.findMenuItemsByUrl(url, this.menuItems);
        foundedItems.forEach((item) => {
            this.activateMenuItem(item);
        });
    }

    deactivateMenuItems(items: MenuItem[]): void {
        items.forEach((item: MenuItem) => {
            item.isActive = false;
            item.isCollapsed = true;
            if (item.children) {
                this.deactivateMenuItems(item.children);
            }
        });
    }

    findMenuItemsByUrl(url: string, items: MenuItem[], foundedItems: MenuItem[] = []): MenuItem[] {
        items.forEach((item: MenuItem) => {
            if (item.route && url.startsWith(item.route)) {
                foundedItems.push(item);
            } else if (item.children) {
                this.findMenuItemsByUrl(url, item.children, foundedItems);
            }
        });
        return foundedItems;
    }


    activateMenuItem(item: MenuItem): void {
        item.isActive = true;
        if (item.children) {
            item.isCollapsed = false;
        }
        this.activatedMenuItems.push(item);
        if (item.parentId) {
            this.activateMenuItem(this.menuItemsMap[item.parentId]);
        }
    }

    isMenuItemVisible(item: MenuItem): boolean {
        if (!item.permissionName) {
            return true;
        }
        return this.permission.isGranted(item.permissionName);
    }
}
