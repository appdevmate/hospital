import {
  BaseComponent
} from "./chunk-SDIPDP6M.js";
import {
  BaseStyle
} from "./chunk-UZ6FKPFG.js";
import {
  PrimeTemplate,
  SharedModule
} from "./chunk-6W6MVVYN.js";
import "./chunk-3P3YI57Q.js";
import "./chunk-ICG2ZITK.js";
import {
  CommonModule,
  NgTemplateOutlet,
  isPlatformBrowser
} from "./chunk-7ACODBRA.js";
import "./chunk-5KK3G4LL.js";
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  Injectable,
  Input,
  NgModule,
  ViewEncapsulation,
  inject,
  setClassMetadata,
  ɵɵInheritDefinitionFeature,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵcontentQuery,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetInheritedFactory,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵproperty,
  ɵɵqueryRefresh,
  ɵɵtemplate
} from "./chunk-DL5YMDBM.js";
import "./chunk-YVXMBCE5.js";
import "./chunk-G6ECYYJH.js";
import "./chunk-RTGP7ALM.js";
import "./chunk-4MWRP73S.js";

// node_modules/@primeuix/styles/dist/imagecompare/index.mjs
var style = "\n    .p-imagecompare {\n        position: relative;\n        overflow: hidden;\n        width: 100%;\n        aspect-ratio: 16 / 9;\n    }\n\n    .p-imagecompare img {\n        width: 100%;\n        height: 100%;\n        position: absolute;\n    }\n\n    .p-imagecompare img + img {\n        clip-path: polygon(0 0, dt('imagecompare.scope.x', '50%') 0, dt('imagecompare.scope.x', '50%') 100%, 0 100%);\n    }\n\n    .p-imagecompare:dir(rtl) img + img {\n        clip-path: polygon(calc(100% - dt('imagecompare.scope.x', '50%')) 0, 100% 0, 100% 100%, calc(100% - dt('imagecompare.scope.x', '50%')) 100%);\n    }\n\n    .p-imagecompare-slider {\n        position: relative;\n        -webkit-appearance: none;\n        width: calc(100% + dt('imagecompare.handle.size'));\n        height: 100%;\n        margin-inline-start: calc(-1 * calc(dt('imagecompare.handle.size') / 2));\n        background-color: transparent;\n        outline: none;\n        transition: all dt('imagecompare.handle.transition.duration');\n    }\n\n    .p-imagecompare-slider::-webkit-slider-thumb {\n        -webkit-appearance: none;\n        height: dt('imagecompare.handle.size');\n        width: dt('imagecompare.handle.size');\n        background: dt('imagecompare.handle.background');\n        border: dt('imagecompare.handle.border.width') solid dt('imagecompare.handle.border.color');\n        border-radius: dt('imagecompare.handle.border.radius');\n        background-size: contain;\n        cursor: ew-resize;\n        transition: all dt('imagecompare.handle.transition.duration');\n    }\n\n    .p-imagecompare-slider::-moz-range-thumb {\n        height: dt('imagecompare.handle.size');\n        width: dt('imagecompare.handle.size');\n        background: dt('imagecompare.handle.background');\n        border: dt('imagecompare.handle.border.width') dt('imagecompare.handle.border.style') dt('imagecompare.handle.border.color');\n        border-radius: dt('imagecompare.handle.border.radius');\n        background-size: contain;\n        cursor: ew-resize;\n    }\n\n    .p-imagecompare-slider:focus-visible::-webkit-slider-thumb {\n        box-shadow: dt('imagecompare.handle.focus.ring.shadow');\n        outline: dt('imagecompare.handle.focus.ring.width') dt('imagecompare.handle.focus.ring.style') dt('imagecompare.handle.focus.ring.color');\n        outline-offset: dt('imagecompare.handle.focus.ring.offset');\n    }\n\n    .p-imagecompare-slider:focus-visible::-moz-range-thumb {\n        box-shadow: dt('imagecompare.handle.focus.ring.shadow');\n        outline: dt('imagecompare.handle.focus.ring.width') dt('imagecompare.handle.focus.ring.style') dt('imagecompare.handle.focus.ring.color');\n        outline-offset: dt('imagecompare.handle.focus.ring.offset');\n    }\n\n    .p-imagecompare-slider:hover {\n        width: calc(100% + dt('imagecompare.handle.hover.size'));\n        margin-inline-start: calc(-1 * calc(dt('imagecompare.handle.hover.size') / 2));\n    }\n\n    .p-imagecompare-slider:hover::-webkit-slider-thumb {\n        background: dt('imagecompare.handle.hover.background');\n        border-color: dt('imagecompare.handle.hover.border.color');\n        height: dt('imagecompare.handle.hover.size');\n        width: dt('imagecompare.handle.hover.size');\n    }\n\n    .p-imagecompare-slider:hover::-moz-range-thumb {\n        background: dt('imagecompare.handle.hover.background');\n        border-color: dt('imagecompare.handle.hover.border.color');\n        height: dt('imagecompare.handle.hover.size');\n        width: dt('imagecompare.handle.hover.size');\n    }\n";

// node_modules/primeng/fesm2022/primeng-imagecompare.mjs
var _c0 = ["left"];
var _c1 = ["right"];
function ImageCompare_0_ng_template_0_Template(rf, ctx) {
}
function ImageCompare_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, ImageCompare_0_ng_template_0_Template, 0, 0, "ng-template");
  }
}
function ImageCompare_1_ng_template_0_Template(rf, ctx) {
}
function ImageCompare_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, ImageCompare_1_ng_template_0_Template, 0, 0, "ng-template");
  }
}
var classes = {
  root: "p-imagecompare",
  slider: "p-imagecompare-slider"
};
var ImageCompareStyle = class _ImageCompareStyle extends BaseStyle {
  name = "imagecompare";
  theme = style;
  classes = classes;
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵImageCompareStyle_BaseFactory;
    return function ImageCompareStyle_Factory(__ngFactoryType__) {
      return (ɵImageCompareStyle_BaseFactory || (ɵImageCompareStyle_BaseFactory = ɵɵgetInheritedFactory(_ImageCompareStyle)))(__ngFactoryType__ || _ImageCompareStyle);
    };
  })();
  static ɵprov = ɵɵdefineInjectable({
    token: _ImageCompareStyle,
    factory: _ImageCompareStyle.ɵfac
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ImageCompareStyle, [{
    type: Injectable
  }], null, null);
})();
var ImageCompareClasses;
(function(ImageCompareClasses2) {
  ImageCompareClasses2["root"] = "p-imagecompare";
  ImageCompareClasses2["slider"] = "p-imagecompare-slider";
})(ImageCompareClasses || (ImageCompareClasses = {}));
var ImageCompare = class _ImageCompare extends BaseComponent {
  /**
   * Index of the element in tabbing order.
   * @defaultValue 0
   * @group Props
   */
  tabindex;
  /**
   * Defines a string value that labels an interactive element.
   * @group Props
   */
  ariaLabelledby;
  /**
   * Identifier of the underlying input element.
   * @group Props
   */
  ariaLabel;
  /**
   * Template for the left side.
   * @group Templates
   */
  leftTemplate;
  /**
   * Template for the right side.
   * @group Templates
   */
  rightTemplate;
  _leftTemplate;
  _rightTemplate;
  templates;
  _componentStyle = inject(ImageCompareStyle);
  mutationObserver;
  isRTL = false;
  ngOnInit() {
    super.ngOnInit();
    this.updateDirection();
    this.observeDirectionChanges();
  }
  ngAfterContentInit() {
    this.templates?.forEach((item) => {
      switch (item.getType()) {
        case "left":
          this._leftTemplate = item.template;
          break;
        case "right":
          this._rightTemplate = item.template;
          break;
      }
    });
  }
  onSlide(event) {
    const value = event.target.value;
    const image = event.target.previousElementSibling;
    if (this.isRTL) {
      image.style.clipPath = `polygon(${100 - value}% 0, 100% 0, 100% 100%, ${100 - value}% 100%)`;
    } else {
      image.style.clipPath = `polygon(0 0, ${value}% 0, ${value}% 100%, 0 100%)`;
    }
  }
  updateDirection() {
    this.isRTL = !!this.el.nativeElement.closest('[dir="rtl"]');
  }
  observeDirectionChanges() {
    if (isPlatformBrowser(this.platformId)) {
      const targetNode = document?.documentElement;
      const config = {
        attributes: true,
        attributeFilter: ["dir"]
      };
      this.mutationObserver = new MutationObserver(() => {
        this.updateDirection();
      });
      this.mutationObserver.observe(targetNode, config);
    }
  }
  ngOnDestroy() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    super.ngOnDestroy();
  }
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵImageCompare_BaseFactory;
    return function ImageCompare_Factory(__ngFactoryType__) {
      return (ɵImageCompare_BaseFactory || (ɵImageCompare_BaseFactory = ɵɵgetInheritedFactory(_ImageCompare)))(__ngFactoryType__ || _ImageCompare);
    };
  })();
  static ɵcmp = ɵɵdefineComponent({
    type: _ImageCompare,
    selectors: [["p-imageCompare"], ["p-imagecompare"], ["p-image-compare"]],
    contentQueries: function ImageCompare_ContentQueries(rf, ctx, dirIndex) {
      if (rf & 1) {
        ɵɵcontentQuery(dirIndex, _c0, 4);
        ɵɵcontentQuery(dirIndex, _c1, 4);
        ɵɵcontentQuery(dirIndex, PrimeTemplate, 4);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.leftTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.rightTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.templates = _t);
      }
    },
    hostVars: 5,
    hostBindings: function ImageCompare_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵattribute("tabindex", ctx.tabindex)("aria-labelledby", ctx.ariaLabelledby)("aria-label", ctx.ariaLabel);
        ɵɵclassMap(ctx.cx("root"));
      }
    },
    inputs: {
      tabindex: "tabindex",
      ariaLabelledby: "ariaLabelledby",
      ariaLabel: "ariaLabel"
    },
    features: [ɵɵProvidersFeature([ImageCompareStyle]), ɵɵInheritDefinitionFeature],
    decls: 3,
    vars: 4,
    consts: [[4, "ngTemplateOutlet"], ["type", "range", "min", "0", "max", "100", "value", "50", 3, "input"]],
    template: function ImageCompare_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵtemplate(0, ImageCompare_0_Template, 1, 0, null, 0)(1, ImageCompare_1_Template, 1, 0, null, 0);
        ɵɵelementStart(2, "input", 1);
        ɵɵlistener("input", function ImageCompare_Template_input_input_2_listener($event) {
          return ctx.onSlide($event);
        });
        ɵɵelementEnd();
      }
      if (rf & 2) {
        ɵɵproperty("ngTemplateOutlet", ctx.leftTemplate || ctx._leftTemplate);
        ɵɵadvance();
        ɵɵproperty("ngTemplateOutlet", ctx.rightTemplate || ctx._rightTemplate);
        ɵɵadvance();
        ɵɵclassMap(ctx.cx("slider"));
      }
    },
    dependencies: [CommonModule, NgTemplateOutlet, SharedModule],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ImageCompare, [{
    type: Component,
    args: [{
      selector: "p-imageCompare, p-imagecompare, p-image-compare",
      standalone: true,
      imports: [CommonModule, SharedModule],
      template: `
        <ng-template *ngTemplateOutlet="leftTemplate || _leftTemplate"></ng-template>
        <ng-template *ngTemplateOutlet="rightTemplate || _rightTemplate"></ng-template>

        <input type="range" min="0" max="100" value="50" (input)="onSlide($event)" [class]="cx('slider')" />
    `,
      host: {
        "[class]": "cx('root')",
        "[attr.tabindex]": "tabindex",
        "[attr.aria-labelledby]": "ariaLabelledby",
        "[attr.aria-label]": "ariaLabel"
      },
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      providers: [ImageCompareStyle]
    }]
  }], null, {
    tabindex: [{
      type: Input
    }],
    ariaLabelledby: [{
      type: Input
    }],
    ariaLabel: [{
      type: Input
    }],
    leftTemplate: [{
      type: ContentChild,
      args: ["left", {
        descendants: false
      }]
    }],
    rightTemplate: [{
      type: ContentChild,
      args: ["right", {
        descendants: false
      }]
    }],
    templates: [{
      type: ContentChildren,
      args: [PrimeTemplate]
    }]
  });
})();
var ImageCompareModule = class _ImageCompareModule {
  static ɵfac = function ImageCompareModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ImageCompareModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _ImageCompareModule,
    imports: [ImageCompare, SharedModule],
    exports: [ImageCompare, SharedModule]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [ImageCompare, SharedModule, SharedModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ImageCompareModule, [{
    type: NgModule,
    args: [{
      imports: [ImageCompare, SharedModule],
      exports: [ImageCompare, SharedModule]
    }]
  }], null, null);
})();
export {
  ImageCompare,
  ImageCompareClasses,
  ImageCompareModule,
  ImageCompareStyle
};
//# sourceMappingURL=primeng_imagecompare.js.map
