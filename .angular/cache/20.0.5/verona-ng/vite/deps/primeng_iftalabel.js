import {
  BaseComponent
} from "./chunk-SDIPDP6M.js";
import {
  BaseStyle
} from "./chunk-UZ6FKPFG.js";
import {
  SharedModule
} from "./chunk-6W6MVVYN.js";
import {
  RouterModule
} from "./chunk-ZK2OD2FE.js";
import "./chunk-U2K3WQVJ.js";
import "./chunk-XJ4KX4UW.js";
import "./chunk-V75OULSU.js";
import "./chunk-3P3YI57Q.js";
import "./chunk-ICG2ZITK.js";
import {
  CommonModule
} from "./chunk-7ACODBRA.js";
import "./chunk-5KK3G4LL.js";
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  NgModule,
  ViewEncapsulation,
  inject,
  setClassMetadata,
  ɵɵInheritDefinitionFeature,
  ɵɵProvidersFeature,
  ɵɵclassMap,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵgetInheritedFactory,
  ɵɵprojection,
  ɵɵprojectionDef
} from "./chunk-DL5YMDBM.js";
import "./chunk-YVXMBCE5.js";
import "./chunk-G6ECYYJH.js";
import "./chunk-RTGP7ALM.js";
import "./chunk-4MWRP73S.js";

// node_modules/@primeuix/styles/dist/iftalabel/index.mjs
var style = "\n    .p-iftalabel {\n        display: block;\n        position: relative;\n    }\n\n    .p-iftalabel label {\n        position: absolute;\n        pointer-events: none;\n        top: dt('iftalabel.top');\n        transition-property: all;\n        transition-timing-function: ease;\n        line-height: 1;\n        font-size: dt('iftalabel.font.size');\n        font-weight: dt('iftalabel.font.weight');\n        inset-inline-start: dt('iftalabel.position.x');\n        color: dt('iftalabel.color');\n        transition-duration: dt('iftalabel.transition.duration');\n    }\n\n    .p-iftalabel .p-inputtext,\n    .p-iftalabel .p-textarea,\n    .p-iftalabel .p-select-label,\n    .p-iftalabel .p-multiselect-label,\n    .p-iftalabel .p-autocomplete-input-multiple,\n    .p-iftalabel .p-cascadeselect-label,\n    .p-iftalabel .p-treeselect-label {\n        padding-block-start: dt('iftalabel.input.padding.top');\n        padding-block-end: dt('iftalabel.input.padding.bottom');\n    }\n\n    .p-iftalabel:has(.p-invalid) label {\n        color: dt('iftalabel.invalid.color');\n    }\n\n    .p-iftalabel:has(input:focus) label,\n    .p-iftalabel:has(input:-webkit-autofill) label,\n    .p-iftalabel:has(textarea:focus) label,\n    .p-iftalabel:has(.p-inputwrapper-focus) label {\n        color: dt('iftalabel.focus.color');\n    }\n\n    .p-iftalabel .p-inputicon {\n        top: dt('iftalabel.input.padding.top');\n        transform: translateY(25%);\n        margin-top: 0;\n    }\n";

// node_modules/primeng/fesm2022/primeng-iftalabel.mjs
var _c0 = ["*"];
var theme = (
  /*css*/
  `
    ${style}

    /* For PrimeNG */
    .p-iftalabel:has(.ng-invalid.ng-dirty) label {
        color: dt('iftalabel.invalid.color');
    }
`
);
var classes = {
  root: "p-iftalabel"
};
var IftaLabelStyle = class _IftaLabelStyle extends BaseStyle {
  name = "iftalabel";
  theme = theme;
  classes = classes;
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵIftaLabelStyle_BaseFactory;
    return function IftaLabelStyle_Factory(__ngFactoryType__) {
      return (ɵIftaLabelStyle_BaseFactory || (ɵIftaLabelStyle_BaseFactory = ɵɵgetInheritedFactory(_IftaLabelStyle)))(__ngFactoryType__ || _IftaLabelStyle);
    };
  })();
  static ɵprov = ɵɵdefineInjectable({
    token: _IftaLabelStyle,
    factory: _IftaLabelStyle.ɵfac
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(IftaLabelStyle, [{
    type: Injectable
  }], null, null);
})();
var IftaLabelClasses;
(function(IftaLabelClasses2) {
  IftaLabelClasses2["root"] = "p-iftalabel";
})(IftaLabelClasses || (IftaLabelClasses = {}));
var IftaLabel = class _IftaLabel extends BaseComponent {
  _componentStyle = inject(IftaLabelStyle);
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵIftaLabel_BaseFactory;
    return function IftaLabel_Factory(__ngFactoryType__) {
      return (ɵIftaLabel_BaseFactory || (ɵIftaLabel_BaseFactory = ɵɵgetInheritedFactory(_IftaLabel)))(__ngFactoryType__ || _IftaLabel);
    };
  })();
  static ɵcmp = ɵɵdefineComponent({
    type: _IftaLabel,
    selectors: [["p-iftalabel"], ["p-iftaLabel"], ["p-ifta-label"]],
    hostVars: 2,
    hostBindings: function IftaLabel_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵclassMap(ctx.cx("root"));
      }
    },
    features: [ɵɵProvidersFeature([IftaLabelStyle]), ɵɵInheritDefinitionFeature],
    ngContentSelectors: _c0,
    decls: 1,
    vars: 0,
    template: function IftaLabel_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef();
        ɵɵprojection(0);
      }
    },
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(IftaLabel, [{
    type: Component,
    args: [{
      selector: "p-iftalabel, p-iftaLabel, p-ifta-label",
      standalone: true,
      template: ` <ng-content></ng-content> `,
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      providers: [IftaLabelStyle],
      host: {
        "[class]": "cx('root')"
      }
    }]
  }], null, null);
})();
var IftaLabelModule = class _IftaLabelModule {
  static ɵfac = function IftaLabelModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _IftaLabelModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _IftaLabelModule,
    imports: [IftaLabel, CommonModule, SharedModule, RouterModule],
    exports: [IftaLabel, SharedModule]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [CommonModule, SharedModule, RouterModule, SharedModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(IftaLabelModule, [{
    type: NgModule,
    args: [{
      imports: [IftaLabel, CommonModule, SharedModule, RouterModule],
      exports: [IftaLabel, SharedModule]
    }]
  }], null, null);
})();
export {
  IftaLabel,
  IftaLabelClasses,
  IftaLabelModule,
  IftaLabelStyle
};
//# sourceMappingURL=primeng_iftalabel.js.map
