import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: '[app-menu]',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<div class="layout-menu-container" #menuContainer>
        <ul class="layout-menu">
            <ng-container *ngFor="let item of model; let i = index">
                <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
                <li *ngIf="item.separator" class="menu-separator"></li>
            </ng-container>
        </ul>
    </div>`
})
export class AppMenu {
    el: ElementRef = inject(ElementRef);

    @ViewChild('menuContainer') menuContainer!: ElementRef;

    model: MenuItem[] = [
        {
            label: 'Dashboard',
            icon: 'pi pi-home',
            items: [
                {
                    label: 'SaaS',
                    icon: 'pi pi-desktop',
                    routerLink: ['/']
                },
                {
                    label: 'Sales',
                    icon: 'pi pi-chart-bar',
                    routerLink: ['/dashboard-sales']
                }
            ]
        },
        {
            label: 'UI Kit',
            icon: 'pi pi-star',
            items: [
                {
                    label: 'Form Layout',
                    icon: 'pi pi-id-card',
                    routerLink: ['/uikit/formlayout']
                },
                {
                    label: 'Input',
                    icon: 'pi pi-check-square',
                    routerLink: ['/uikit/input']
                },
                {
                    label: 'Button',
                    icon: 'pi pi-box',
                    routerLink: ['/uikit/button']
                },
                {
                    label: 'Table',
                    icon: 'pi pi-table',
                    routerLink: ['/uikit/table']
                },
                {
                    label: 'List',
                    icon: 'pi pi-list',
                    routerLink: ['/uikit/list']
                },
                {
                    label: 'Tree',
                    icon: 'pi pi-share-alt',
                    routerLink: ['/uikit/tree']
                },
                {
                    label: 'Panel',
                    icon: 'pi pi-tablet',
                    routerLink: ['/uikit/panel']
                },
                {
                    label: 'Overlay',
                    icon: 'pi pi-clone',
                    routerLink: ['/uikit/overlay']
                },
                {
                    label: 'Media',
                    icon: 'pi pi-image',
                    routerLink: ['/uikit/media']
                },
                {
                    label: 'Menu',
                    icon: 'pi pi-bars',
                    routerLink: ['/uikit/menu']
                },
                {
                    label: 'Message',
                    icon: 'pi pi-comment',
                    routerLink: ['/uikit/message']
                },
                {
                    label: 'File',
                    icon: 'pi pi-file',
                    routerLink: ['/uikit/file']
                },
                {
                    label: 'Chart',
                    icon: 'pi pi-chart-bar',
                    routerLink: ['/uikit/charts']
                },
                {
                    label: 'Timeline',
                    icon: 'pi pi-calendar',
                    routerLink: ['/uikit/timeline']
                },
                {
                    label: 'Misc',
                    icon: 'pi pi-circle-off',
                    routerLink: ['/uikit/misc']
                }
            ]
        },
        {
            label: 'Apps',
            icon: 'pi pi-th-large',
            items: [
                {
                    label: 'Blog',
                    icon: 'pi pi-comment',
                    items: [
                        {
                            label: 'List',
                            icon: 'pi pi-image',
                            routerLink: ['/apps/blog/list']
                        },
                        {
                            label: 'Detail',
                            icon: 'pi pi-list',
                            routerLink: ['/apps/blog/detail']
                        },
                        {
                            label: 'Edit',
                            icon: 'pi pi-pencil',
                            routerLink: ['/apps/blog/edit']
                        }
                    ]
                },
                {
                    label: 'Chat',
                    icon: 'pi pi-comments',
                    routerLink: ['/apps/chat']
                },
                {
                    label: 'Files',
                    icon: 'pi pi-folder',
                    routerLink: ['/apps/files']
                },
                {
                    label: 'Kanban',
                    icon: 'pi pi-sliders-v',
                    routerLink: ['/apps/kanban']
                },
                {
                    label: 'Mail',
                    icon: 'pi pi-envelope',
                    items: [
                        {
                            label: 'Inbox',
                            icon: 'pi pi-inbox',
                            routerLink: ['/apps/mail/inbox']
                        },
                        {
                            label: 'Compose',
                            icon: 'pi pi-pencil',
                            routerLink: ['/apps/mail/compose']
                        },
                        {
                            label: 'Detail',
                            icon: 'pi pi-comment',
                            routerLink: ['/apps/mail/detail/1000']
                        }
                    ]
                },
                {
                    label: 'Task List',
                    icon: 'pi pi-check-square',
                    routerLink: ['/apps/tasklist']
                }
            ]
        },

        {
            label: 'Prime Blocks',
            icon: 'pi pi-prime',
            items: [
                {
                    label: 'Free Blocks',
                    icon: 'pi pi-eye',
                    routerLink: ['/blocks']
                },
                {
                    label: 'All Blocks',
                    icon: 'pi pi-globe',
                    url: 'https://primeblocks.org',
                    target: '_blank'
                }
            ]
        },
        {
            label: 'Utilities',
            icon: 'pi pi-compass',
            items: [
                {
                    label: 'Figma',
                    icon: 'pi pi-pencil',
                    url: 'https://www.figma.com/file/PgQXX4HXMPeCkT74tGajod/Preview-%7C-Verona-2022?type=design&node-id=1303-750&mode=design',
                    target: '_blank'
                }
            ]
        },
        {
            label: 'Pages',
            icon: 'pi pi-briefcase',
            items: [
                {
                    label: 'Landing',
                    icon: 'pi pi-globe',
                    routerLink: ['/landing']
                },
                {
                    label: 'Auth',
                    icon: 'pi pi-user',
                    items: [
                        {
                            label: 'Login',
                            icon: 'pi pi-sign-in',
                            routerLink: ['/auth/login']
                        },
                        {
                            label: 'Error',
                            icon: 'pi pi-times-circle',
                            routerLink: ['/auth/error']
                        },
                        {
                            label: 'Access Denied',
                            icon: 'pi pi-lock',
                            routerLink: ['/auth/access']
                        },
                        {
                            label: 'Register',
                            icon: 'pi pi-user-plus',
                            routerLink: ['/auth/register']
                        },
                        {
                            label: 'Forgot Password',
                            icon: 'pi pi-question',
                            routerLink: ['/auth/forgotpassword']
                        },
                        {
                            label: 'New Password',
                            icon: 'pi pi-cog',
                            routerLink: ['/auth/newpassword']
                        },
                        {
                            label: 'Verification',
                            icon: 'pi pi-envelope',
                            routerLink: ['/auth/verification']
                        },
                        {
                            label: 'Lock Screen',
                            icon: 'pi pi-eye-slash',
                            routerLink: ['/auth/lockscreen']
                        }
                    ]
                },
                {
                    label: 'Crud',
                    icon: 'pi pi-pencil',
                    routerLink: ['/pages/crud']
                },
                {
                    label: 'Invoice',
                    icon: 'pi pi-dollar',
                    routerLink: ['/pages/invoice']
                },
                {
                    label: 'Help',
                    icon: 'pi pi-question-circle',
                    routerLink: ['/pages/help']
                },
                {
                    label: 'Not Found',
                    icon: 'pi pi-exclamation-circle',
                    routerLink: ['/pages/notfound']
                },
                {
                    label: 'Empty',
                    icon: 'pi pi-circle-off',
                    routerLink: ['/pages/empty']
                },
                {
                    label: 'Contact Us',
                    icon: 'pi pi-phone',
                    routerLink: ['/pages/contact']
                }
            ]
        },
        {
            label: 'E-Commerce',
            icon: 'pi pi-wallet',
            items: [
                {
                    label: 'Product Overview',
                    icon: 'pi pi-image',
                    routerLink: ['/ecommerce/product-overview']
                },
                {
                    label: 'Product List',
                    icon: 'pi pi-list',
                    routerLink: ['/ecommerce/product-list']
                },
                {
                    label: 'New Product',
                    icon: 'pi pi-plus',
                    routerLink: ['/ecommerce/new-product']
                },
                {
                    label: 'Shopping Cart',
                    icon: 'pi pi-shopping-cart',
                    routerLink: ['/ecommerce/shopping-cart']
                },
                {
                    label: 'Checkout Form',
                    icon: 'pi pi-check-square',
                    routerLink: ['/ecommerce/checkout-form']
                },
                {
                    label: 'Order History',
                    icon: 'pi pi-history',
                    routerLink: ['/ecommerce/order-history']
                },
                {
                    label: 'Order Summary',
                    icon: 'pi pi-file',
                    routerLink: ['/ecommerce/order-summary']
                }
            ]
        },

        {
            label: 'User Management',
            icon: 'pi pi-user',
            items: [
                {
                    label: 'List',
                    icon: 'pi pi-list',
                    routerLink: ['/profile/list']
                },
                {
                    label: 'Create',
                    icon: 'pi pi-plus',
                    routerLink: ['/profile/create']
                }
            ]
        },
        {
            label: 'Hierarchy',
            icon: 'pi pi-align-left',
            items: [
                {
                    label: 'Submenu 1',
                    icon: 'pi pi-align-left',
                    items: [
                        {
                            label: 'Submenu 1.1',
                            icon: 'pi pi-align-left',
                            items: [
                                {
                                    label: 'Submenu 1.1.1',
                                    icon: 'pi pi-align-left'
                                },
                                {
                                    label: 'Submenu 1.1.2',
                                    icon: 'pi pi-align-left'
                                },
                                {
                                    label: 'Submenu 1.1.3',
                                    icon: 'pi pi-align-left'
                                }
                            ]
                        },
                        {
                            label: 'Submenu 1.2',
                            icon: 'pi pi-align-left',
                            items: [
                                {
                                    label: 'Submenu 1.2.1',
                                    icon: 'pi pi-align-left'
                                }
                            ]
                        }
                    ]
                },
                {
                    label: 'Submenu 2',
                    icon: 'pi pi-align-left',
                    items: [
                        {
                            label: 'Submenu 2.1',
                            icon: 'pi pi-align-left',
                            items: [
                                {
                                    label: 'Submenu 2.1.1',
                                    icon: 'pi pi-align-left'
                                },
                                {
                                    label: 'Submenu 2.1.2',
                                    icon: 'pi pi-align-left'
                                }
                            ]
                        },
                        {
                            label: 'Submenu 2.2',
                            icon: 'pi pi-align-left',
                            items: [
                                {
                                    label: 'Submenu 2.2.1',
                                    icon: 'pi pi-align-left'
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            label: 'Start',
            icon: 'pi pi-download',
            items: [
                {
                    label: 'Buy Now',
                    icon: 'pi pi-shopping-cart',
                    url: 'https://www.primefaces.org/store'
                },
                {
                    label: 'Documentation',
                    icon: 'pi pi-info-circle',
                    routerLink: ['/documentation']
                }
            ]
        }
    ]
}
