import {
  Button,
  ButtonModule
} from "./chunk-YVQRESGR.js";
import "./chunk-TENFQJBN.js";
import "./chunk-PJRMHEN5.js";
import "./chunk-YNLAOK3J.js";
import "./chunk-S73J4WE3.js";
import {
  Ripple
} from "./chunk-OC77X5LN.js";
import {
  TimesIcon
} from "./chunk-RHA7RL5K.js";
import "./chunk-YXZQJBKH.js";
import {
  Bind
} from "./chunk-MLQGRGGO.js";
import {
  BaseComponent,
  PARENT_INSTANCE
} from "./chunk-YNJ5GKCH.js";
import {
  BaseStyle
} from "./chunk-4ATYD752.js";
import {
  PrimeTemplate,
  SharedModule
} from "./chunk-LMEEH3AJ.js";
import "./chunk-GOP36Q47.js";
import "./chunk-UCHM6OXG.js";
import {
  CommonModule,
  NgClass,
  NgIf,
  NgTemplateOutlet
} from "./chunk-FHZAWWEY.js";
import "./chunk-5KK3G4LL.js";
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  EventEmitter,
  Injectable,
  Input,
  NgModule,
  Output,
  ViewEncapsulation,
  booleanAttribute,
  setClassMetadata,
  ɵɵHostDirectivesFeature,
  ɵɵInheritDefinitionFeature,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵcontentQuery,
  ɵɵdefineComponent,
  ɵɵdefineNgModule,
  ɵɵelement,
  ɵɵelementContainer,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵgetInheritedFactory,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵqueryRefresh,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor
} from "./chunk-EIF6IUR4.js";
import {
  InjectionToken,
  inject,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵnamespaceSVG,
  ɵɵresetView,
  ɵɵrestoreView
} from "./chunk-LW34VNAR.js";
import "./chunk-G6ECYYJH.js";
import "./chunk-YVXMBCE5.js";
import "./chunk-RTGP7ALM.js";
import "./chunk-4MWRP73S.js";

// node_modules/@primeuix/styles/dist/inplace/index.mjs
var style = "\n    .p-inplace-display {\n        display: inline-block;\n        cursor: pointer;\n        border: 1px solid transparent;\n        padding: dt('inplace.padding');\n        border-radius: dt('inplace.border.radius');\n        transition:\n            background dt('inplace.transition.duration'),\n            color dt('inplace.transition.duration'),\n            outline-color dt('inplace.transition.duration'),\n            box-shadow dt('inplace.transition.duration');\n        outline-color: transparent;\n    }\n\n    .p-inplace-display:not(.p-disabled):hover {\n        background: dt('inplace.display.hover.background');\n        color: dt('inplace.display.hover.color');\n    }\n\n    .p-inplace-display:focus-visible {\n        box-shadow: dt('inplace.focus.ring.shadow');\n        outline: dt('inplace.focus.ring.width') dt('inplace.focus.ring.style') dt('inplace.focus.ring.color');\n        outline-offset: dt('inplace.focus.ring.offset');\n    }\n\n    .p-inplace-content {\n        display: block;\n    }\n";

// node_modules/primeng/fesm2022/primeng-inplace.mjs
var _c0 = ["*"];
var _c1 = ["display"];
var _c2 = ["content"];
var _c3 = ["closeicon"];
var _c4 = [[["", "pInplaceDisplay", ""]], [["", "pInplaceContent", ""]]];
var _c5 = ["[pInplaceDisplay]", "[pInplaceContent]"];
var _c6 = (a0) => ({
  "p-disabled": a0
});
var _c7 = (a0) => ({
  closeCallback: a0
});
function Inplace_div_0_ng_container_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Inplace_div_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div", 3);
    ɵɵlistener("click", function Inplace_div_0_Template_div_click_0_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r1 = ɵɵnextContext();
      return ɵɵresetView(ctx_r1.onActivateClick($event));
    })("keydown", function Inplace_div_0_Template_div_keydown_0_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r1 = ɵɵnextContext();
      return ɵɵresetView(ctx_r1.onKeydown($event));
    });
    ɵɵprojection(1);
    ɵɵtemplate(2, Inplace_div_0_ng_container_2_Template, 1, 0, "ng-container", 4);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵclassMap(ctx_r1.cx("display"));
    ɵɵproperty("pBind", ctx_r1.ptm("display"))("ngClass", ɵɵpureFunction1(5, _c6, ctx_r1.disabled));
    ɵɵadvance(2);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.displayTemplate || ctx_r1._displayTemplate);
  }
}
function Inplace_div_1_ng_container_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Inplace_div_1_ng_container_3_p_button_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "p-button", 10);
    ɵɵlistener("click", function Inplace_div_1_ng_container_3_p_button_1_Template_p_button_click_0_listener($event) {
      ɵɵrestoreView(_r3);
      const ctx_r1 = ɵɵnextContext(3);
      return ɵɵresetView(ctx_r1.onDeactivateClick($event));
    });
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵproperty("pt", ctx_r1.ptm("pcButton"))("icon", ctx_r1.closeIcon);
    ɵɵattribute("aria-label", ctx_r1.closeAriaLabel);
  }
}
function Inplace_div_1_ng_container_3_p_button_2_ng_template_1__svg_svg_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelement(0, "svg", 13);
  }
}
function Inplace_div_1_ng_container_3_p_button_2_ng_template_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Inplace_div_1_ng_container_3_p_button_2_ng_template_1__svg_svg_0_Template, 1, 0, "svg", 12);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(4);
    ɵɵproperty("ngIf", !ctx_r1.closeIconTemplate && !ctx_r1._closeIconTemplate);
  }
}
function Inplace_div_1_ng_container_3_p_button_2_3_ng_template_0_Template(rf, ctx) {
}
function Inplace_div_1_ng_container_3_p_button_2_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Inplace_div_1_ng_container_3_p_button_2_3_ng_template_0_Template, 0, 0, "ng-template");
  }
}
function Inplace_div_1_ng_container_3_p_button_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "p-button", 11);
    ɵɵlistener("click", function Inplace_div_1_ng_container_3_p_button_2_Template_p_button_click_0_listener($event) {
      ɵɵrestoreView(_r4);
      const ctx_r1 = ɵɵnextContext(3);
      return ɵɵresetView(ctx_r1.onDeactivateClick($event));
    });
    ɵɵtemplate(1, Inplace_div_1_ng_container_3_p_button_2_ng_template_1_Template, 1, 1, "ng-template", null, 0, ɵɵtemplateRefExtractor)(3, Inplace_div_1_ng_container_3_p_button_2_3_Template, 1, 0, null, 4);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵproperty("pt", ctx_r1.ptm("pcButton"));
    ɵɵattribute("aria-label", ctx_r1.closeAriaLabel);
    ɵɵadvance(3);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.closeIconTemplate || ctx_r1._closeIconTemplate);
  }
}
function Inplace_div_1_ng_container_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, Inplace_div_1_ng_container_3_p_button_1_Template, 1, 3, "p-button", 8)(2, Inplace_div_1_ng_container_3_p_button_2_Template, 4, 3, "p-button", 9);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.closeIcon);
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r1.closeIcon);
  }
}
function Inplace_div_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div", 5);
    ɵɵprojection(1, 1);
    ɵɵtemplate(2, Inplace_div_1_ng_container_2_Template, 1, 0, "ng-container", 6)(3, Inplace_div_1_ng_container_3_Template, 3, 2, "ng-container", 7);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵclassMap(ctx_r1.cx("content"));
    ɵɵproperty("pBind", ctx_r1.ptm("content"));
    ɵɵadvance(2);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.contentTemplate || ctx_r1._contentTemplate)("ngTemplateOutletContext", ɵɵpureFunction1(6, _c7, ctx_r1.onDeactivateClick.bind(ctx_r1)));
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.closable);
  }
}
var classes = {
  root: () => ["p-inplace p-component"],
  display: ({
    instance
  }) => ["p-inplace-display", {
    "p-disabled": instance.disabled
  }],
  content: "p-inplace-content"
};
var InplaceStyle = class _InplaceStyle extends BaseStyle {
  name = "inplace";
  style = style;
  classes = classes;
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵInplaceStyle_BaseFactory;
    return function InplaceStyle_Factory(__ngFactoryType__) {
      return (ɵInplaceStyle_BaseFactory || (ɵInplaceStyle_BaseFactory = ɵɵgetInheritedFactory(_InplaceStyle)))(__ngFactoryType__ || _InplaceStyle);
    };
  })();
  static ɵprov = ɵɵdefineInjectable({
    token: _InplaceStyle,
    factory: _InplaceStyle.ɵfac
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InplaceStyle, [{
    type: Injectable
  }], null, null);
})();
var InplaceClasses;
(function(InplaceClasses2) {
  InplaceClasses2["root"] = "p-inplace";
  InplaceClasses2["display"] = "p-inplace-display";
  InplaceClasses2["content"] = "p-inplace-content";
})(InplaceClasses || (InplaceClasses = {}));
var INPLACE_INSTANCE = new InjectionToken("INPLACE_INSTANCE");
var InplaceDisplay = class _InplaceDisplay extends BaseComponent {
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵInplaceDisplay_BaseFactory;
    return function InplaceDisplay_Factory(__ngFactoryType__) {
      return (ɵInplaceDisplay_BaseFactory || (ɵInplaceDisplay_BaseFactory = ɵɵgetInheritedFactory(_InplaceDisplay)))(__ngFactoryType__ || _InplaceDisplay);
    };
  })();
  static ɵcmp = ɵɵdefineComponent({
    type: _InplaceDisplay,
    selectors: [["p-inplacedisplay"], ["p-inplaceDisplay"]],
    features: [ɵɵInheritDefinitionFeature],
    ngContentSelectors: _c0,
    decls: 1,
    vars: 0,
    template: function InplaceDisplay_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵprojection(0);
      }
    },
    dependencies: [CommonModule],
    encapsulation: 2
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InplaceDisplay, [{
    type: Component,
    args: [{
      selector: "p-inplacedisplay, p-inplaceDisplay",
      standalone: true,
      imports: [CommonModule],
      template: "<ng-content></ng-content>"
    }]
  }], null, null);
})();
var InplaceContent = class _InplaceContent extends BaseComponent {
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵInplaceContent_BaseFactory;
    return function InplaceContent_Factory(__ngFactoryType__) {
      return (ɵInplaceContent_BaseFactory || (ɵInplaceContent_BaseFactory = ɵɵgetInheritedFactory(_InplaceContent)))(__ngFactoryType__ || _InplaceContent);
    };
  })();
  static ɵcmp = ɵɵdefineComponent({
    type: _InplaceContent,
    selectors: [["p-inplacecontent"], ["p-inplaceContent"]],
    features: [ɵɵInheritDefinitionFeature],
    ngContentSelectors: _c0,
    decls: 1,
    vars: 0,
    template: function InplaceContent_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵprojection(0);
      }
    },
    dependencies: [CommonModule],
    encapsulation: 2
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InplaceContent, [{
    type: Component,
    args: [{
      selector: "p-inplacecontent, p-inplaceContent",
      standalone: true,
      imports: [CommonModule],
      template: "<ng-content></ng-content>"
    }]
  }], null, null);
})();
var Inplace = class _Inplace extends BaseComponent {
  $pcInplace = inject(INPLACE_INSTANCE, {
    optional: true,
    skipSelf: true
  }) ?? void 0;
  bindDirectiveInstance = inject(Bind, {
    self: true
  });
  onAfterViewChecked() {
    this.bindDirectiveInstance.setAttrs(this.ptms(["host", "root"]));
  }
  /**
   * Whether the content is displayed or not.
   * @group Props
   */
  active = false;
  /**
   * Displays a button to switch back to display mode.
   * @deprecated since v20.0.0, use `closeCallback` within content template.
   * @group Props
   */
  closable = false;
  /**
   * When present, it specifies that the element should be disabled.
   * @group Props
   */
  disabled = false;
  /**
   * Allows to prevent clicking.
   * @group Props
   */
  preventClick;
  /**
   * Class of the element.
   * @deprecated since v20.0.0, use `class` instead.
   * @group Props
   */
  styleClass;
  /**
   * Icon to display in the close button.
   * @deprecated since v20.0.0, use `class` instead.
   * @group Props
   */
  closeIcon;
  /**
   * Establishes a string value that labels the close button.
   * @group Props
   */
  closeAriaLabel;
  /**
   * Callback to invoke when inplace is opened.
   * @param {Event} event - Browser event.
   * @group Emits
   */
  onActivate = new EventEmitter();
  /**
   * Callback to invoke when inplace is closed.
   * @param {Event} event - Browser event.
   * @group Emits
   */
  onDeactivate = new EventEmitter();
  hover;
  /**
   * Display template of the element.
   * @group Templates
   */
  displayTemplate;
  /**
   * Content template of the element.
   * @group Templates
   */
  contentTemplate;
  /**
   * Close icon template of the element.
   * @group Templates
   */
  closeIconTemplate;
  _componentStyle = inject(InplaceStyle);
  onActivateClick(event) {
    if (!this.preventClick) this.activate(event);
  }
  onDeactivateClick(event) {
    if (!this.preventClick) this.deactivate(event);
  }
  /**
   * Activates the content.
   * @param {Event} event - Browser event.
   * @group Method
   */
  activate(event) {
    if (!this.disabled) {
      this.active = true;
      this.onActivate.emit(event);
      this.cd.markForCheck();
    }
  }
  /**
   * Deactivates the content.
   * @param {Event} event - Browser event.
   * @group Method
   */
  deactivate(event) {
    if (!this.disabled) {
      this.active = false;
      this.hover = false;
      this.onDeactivate.emit(event);
      this.cd.markForCheck();
    }
  }
  onKeydown(event) {
    if (event.code === "Enter") {
      this.activate(event);
      event.preventDefault();
    }
  }
  templates;
  _displayTemplate;
  _closeIconTemplate;
  _contentTemplate;
  onAfterContentInit() {
    this.templates?.forEach((item) => {
      switch (item.getType()) {
        case "display":
          this._displayTemplate = item.template;
          break;
        case "closeicon":
          this._closeIconTemplate = item.template;
          break;
        case "content":
          this._contentTemplate = item.template;
          break;
      }
    });
  }
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵInplace_BaseFactory;
    return function Inplace_Factory(__ngFactoryType__) {
      return (ɵInplace_BaseFactory || (ɵInplace_BaseFactory = ɵɵgetInheritedFactory(_Inplace)))(__ngFactoryType__ || _Inplace);
    };
  })();
  static ɵcmp = ɵɵdefineComponent({
    type: _Inplace,
    selectors: [["p-inplace"]],
    contentQueries: function Inplace_ContentQueries(rf, ctx, dirIndex) {
      if (rf & 1) {
        ɵɵcontentQuery(dirIndex, _c1, 4);
        ɵɵcontentQuery(dirIndex, _c2, 4);
        ɵɵcontentQuery(dirIndex, _c3, 4);
        ɵɵcontentQuery(dirIndex, PrimeTemplate, 4);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.displayTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.contentTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.closeIconTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.templates = _t);
      }
    },
    hostVars: 3,
    hostBindings: function Inplace_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵattribute("aria-live", "polite");
        ɵɵclassMap(ctx.cn(ctx.cx("root"), ctx.styleClass));
      }
    },
    inputs: {
      active: [2, "active", "active", booleanAttribute],
      closable: [2, "closable", "closable", booleanAttribute],
      disabled: [2, "disabled", "disabled", booleanAttribute],
      preventClick: [2, "preventClick", "preventClick", booleanAttribute],
      styleClass: "styleClass",
      closeIcon: "closeIcon",
      closeAriaLabel: "closeAriaLabel"
    },
    outputs: {
      onActivate: "onActivate",
      onDeactivate: "onDeactivate"
    },
    features: [ɵɵProvidersFeature([InplaceStyle, {
      provide: INPLACE_INSTANCE,
      useExisting: _Inplace
    }, {
      provide: PARENT_INSTANCE,
      useExisting: _Inplace
    }]), ɵɵHostDirectivesFeature([Bind]), ɵɵInheritDefinitionFeature],
    ngContentSelectors: _c5,
    decls: 2,
    vars: 2,
    consts: [["icon", ""], ["tabindex", "0", "role", "button", 3, "class", "pBind", "ngClass", "click", "keydown", 4, "ngIf"], [3, "class", "pBind", 4, "ngIf"], ["tabindex", "0", "role", "button", 3, "click", "keydown", "pBind", "ngClass"], [4, "ngTemplateOutlet"], [3, "pBind"], [4, "ngTemplateOutlet", "ngTemplateOutletContext"], [4, "ngIf"], ["type", "button", "pRipple", "", 3, "pt", "icon", "click", 4, "ngIf"], ["type", "button", "pRipple", "", 3, "pt", "click", 4, "ngIf"], ["type", "button", "pRipple", "", 3, "click", "pt", "icon"], ["type", "button", "pRipple", "", 3, "click", "pt"], ["data-p-icon", "times", 4, "ngIf"], ["data-p-icon", "times"]],
    template: function Inplace_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef(_c4);
        ɵɵtemplate(0, Inplace_div_0_Template, 3, 7, "div", 1)(1, Inplace_div_1_Template, 4, 8, "div", 2);
      }
      if (rf & 2) {
        ɵɵproperty("ngIf", !ctx.active);
        ɵɵadvance();
        ɵɵproperty("ngIf", ctx.active);
      }
    },
    dependencies: [CommonModule, NgClass, NgIf, NgTemplateOutlet, ButtonModule, Button, TimesIcon, SharedModule, Ripple, Bind],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Inplace, [{
    type: Component,
    args: [{
      selector: "p-inplace",
      standalone: true,
      imports: [CommonModule, ButtonModule, TimesIcon, SharedModule, Ripple, Bind],
      template: `
        <div [class]="cx('display')" [pBind]="ptm('display')" (click)="onActivateClick($event)" tabindex="0" role="button" (keydown)="onKeydown($event)" [ngClass]="{ 'p-disabled': disabled }" *ngIf="!active">
            <ng-content select="[pInplaceDisplay]"></ng-content>
            <ng-container *ngTemplateOutlet="displayTemplate || _displayTemplate"></ng-container>
        </div>
        <div [class]="cx('content')" [pBind]="ptm('content')" *ngIf="active">
            <ng-content select="[pInplaceContent]"></ng-content>
            <ng-container *ngTemplateOutlet="contentTemplate || _contentTemplate; context: { closeCallback: onDeactivateClick.bind(this) }"></ng-container>

            <ng-container *ngIf="closable">
                <p-button *ngIf="closeIcon" [pt]="ptm('pcButton')" type="button" [icon]="closeIcon" pRipple (click)="onDeactivateClick($event)" [attr.aria-label]="closeAriaLabel"></p-button>
                <p-button *ngIf="!closeIcon" [pt]="ptm('pcButton')" type="button" pRipple (click)="onDeactivateClick($event)" [attr.aria-label]="closeAriaLabel">
                    <ng-template #icon>
                        <svg data-p-icon="times" *ngIf="!closeIconTemplate && !_closeIconTemplate" />
                    </ng-template>
                    <ng-template *ngTemplateOutlet="closeIconTemplate || _closeIconTemplate"></ng-template>
                </p-button>
            </ng-container>
        </div>
    `,
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      providers: [InplaceStyle, {
        provide: INPLACE_INSTANCE,
        useExisting: Inplace
      }, {
        provide: PARENT_INSTANCE,
        useExisting: Inplace
      }],
      host: {
        "[attr.aria-live]": "'polite'",
        "[class]": "cn(cx('root'), styleClass)"
      },
      hostDirectives: [Bind]
    }]
  }], null, {
    active: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    closable: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    disabled: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    preventClick: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    styleClass: [{
      type: Input
    }],
    closeIcon: [{
      type: Input
    }],
    closeAriaLabel: [{
      type: Input
    }],
    onActivate: [{
      type: Output
    }],
    onDeactivate: [{
      type: Output
    }],
    displayTemplate: [{
      type: ContentChild,
      args: ["display", {
        descendants: false
      }]
    }],
    contentTemplate: [{
      type: ContentChild,
      args: ["content", {
        descendants: false
      }]
    }],
    closeIconTemplate: [{
      type: ContentChild,
      args: ["closeicon", {
        descendants: false
      }]
    }],
    templates: [{
      type: ContentChildren,
      args: [PrimeTemplate]
    }]
  });
})();
var InplaceModule = class _InplaceModule {
  static ɵfac = function InplaceModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InplaceModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _InplaceModule,
    imports: [Inplace, InplaceContent, InplaceDisplay, SharedModule],
    exports: [Inplace, InplaceContent, InplaceDisplay, SharedModule]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [Inplace, InplaceContent, InplaceDisplay, SharedModule, SharedModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InplaceModule, [{
    type: NgModule,
    args: [{
      imports: [Inplace, InplaceContent, InplaceDisplay, SharedModule],
      exports: [Inplace, InplaceContent, InplaceDisplay, SharedModule]
    }]
  }], null, null);
})();
export {
  Inplace,
  InplaceClasses,
  InplaceContent,
  InplaceDisplay,
  InplaceModule,
  InplaceStyle
};
//# sourceMappingURL=primeng_inplace.js.map
