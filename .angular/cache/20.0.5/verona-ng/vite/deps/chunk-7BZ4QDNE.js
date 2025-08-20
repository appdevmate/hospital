import {
  Checkbox
} from "./chunk-TS4UB7YB.js";
import {
  InputIcon
} from "./chunk-MJBCUJJH.js";
import {
  IconField
} from "./chunk-XSJ6NFNI.js";
import {
  Scroller
} from "./chunk-WO2HXLNS.js";
import {
  InputText
} from "./chunk-TN5ADRDY.js";
import {
  BaseEditableHolder
} from "./chunk-XUDNEHKK.js";
import {
  Ripple
} from "./chunk-LAT37U4B.js";
import {
  BlankIcon,
  CheckIcon,
  SearchIcon
} from "./chunk-ZUWJ75XG.js";
import {
  BaseStyle
} from "./chunk-UZ6FKPFG.js";
import {
  FilterService,
  Footer,
  Header,
  PrimeTemplate,
  SharedModule
} from "./chunk-6W6MVVYN.js";
import {
  FormsModule,
  NG_VALUE_ACCESSOR,
  NgControlStatus,
  NgModel
} from "./chunk-F3LB25CD.js";
import {
  M,
  a,
  bt,
  c,
  j,
  k,
  l,
  s,
  s3 as s2,
  vt,
  z2 as z
} from "./chunk-ICG2ZITK.js";
import {
  CDK_DRAG_CONFIG,
  CdkDrag,
  CdkDropList,
  DragDropModule
} from "./chunk-4ZBHTZPR.js";
import {
  CommonModule,
  NgClass,
  NgForOf,
  NgIf,
  NgStyle,
  NgTemplateOutlet
} from "./chunk-7ACODBRA.js";
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  EventEmitter,
  HostListener,
  Injectable,
  Input,
  NgModule,
  Output,
  ViewChild,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  numberAttribute,
  setClassMetadata,
  signal,
  ɵɵInheritDefinitionFeature,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵcontentQuery,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
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
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵpureFunction1,
  ɵɵpureFunction2,
  ɵɵpureFunction3,
  ɵɵpureFunction4,
  ɵɵqueryRefresh,
  ɵɵreference,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleMap,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵviewQuery
} from "./chunk-DL5YMDBM.js";

// node_modules/@primeuix/styles/dist/listbox/index.mjs
var style = "\n    .p-listbox {\n        display: block;\n        background: dt('listbox.background');\n        color: dt('listbox.color');\n        border: 1px solid dt('listbox.border.color');\n        border-radius: dt('listbox.border.radius');\n        transition:\n            background dt('listbox.transition.duration'),\n            color dt('listbox.transition.duration'),\n            border-color dt('listbox.transition.duration'),\n            box-shadow dt('listbox.transition.duration'),\n            outline-color dt('listbox.transition.duration');\n        outline-color: transparent;\n        box-shadow: dt('listbox.shadow');\n    }\n\n    .p-listbox.p-disabled {\n        opacity: 1;\n        background: dt('listbox.disabled.background');\n        color: dt('listbox.disabled.color');\n    }\n\n    .p-listbox.p-disabled .p-listbox-option {\n        color: dt('listbox.disabled.color');\n    }\n\n    .p-listbox.p-invalid {\n        border-color: dt('listbox.invalid.border.color');\n    }\n\n    .p-listbox-header {\n        padding: dt('listbox.list.header.padding');\n    }\n\n    .p-listbox-filter {\n        width: 100%;\n    }\n\n    .p-listbox-list-container {\n        overflow: auto;\n    }\n\n    .p-listbox-list {\n        list-style-type: none;\n        margin: 0;\n        padding: dt('listbox.list.padding');\n        outline: 0 none;\n        display: flex;\n        flex-direction: column;\n        gap: dt('listbox.list.gap');\n    }\n\n    .p-listbox-option {\n        display: flex;\n        align-items: center;\n        cursor: pointer;\n        position: relative;\n        overflow: hidden;\n        padding: dt('listbox.option.padding');\n        border: 0 none;\n        border-radius: dt('listbox.option.border.radius');\n        color: dt('listbox.option.color');\n        transition:\n            background dt('listbox.transition.duration'),\n            color dt('listbox.transition.duration'),\n            border-color dt('listbox.transition.duration'),\n            box-shadow dt('listbox.transition.duration'),\n            outline-color dt('listbox.transition.duration');\n    }\n\n    .p-listbox-striped li:nth-child(even of .p-listbox-option) {\n        background: dt('listbox.option.striped.background');\n    }\n\n    .p-listbox .p-listbox-list .p-listbox-option.p-listbox-option-selected {\n        background: dt('listbox.option.selected.background');\n        color: dt('listbox.option.selected.color');\n    }\n\n    .p-listbox:not(.p-disabled) .p-listbox-option.p-listbox-option-selected.p-focus {\n        background: dt('listbox.option.selected.focus.background');\n        color: dt('listbox.option.selected.focus.color');\n    }\n\n    .p-listbox:not(.p-disabled) .p-listbox-option:not(.p-listbox-option-selected):not(.p-disabled).p-focus {\n        background: dt('listbox.option.focus.background');\n        color: dt('listbox.option.focus.color');\n    }\n\n    .p-listbox:not(.p-disabled) .p-listbox-option:not(.p-listbox-option-selected):not(.p-disabled):hover {\n        background: dt('listbox.option.focus.background');\n        color: dt('listbox.option.focus.color');\n    }\n\n    .p-listbox-option-blank-icon {\n        flex-shrink: 0;\n    }\n\n    .p-listbox-option-check-icon {\n        position: relative;\n        flex-shrink: 0;\n        margin-inline-start: dt('listbox.checkmark.gutter.start');\n        margin-inline-end: dt('listbox.checkmark.gutter.end');\n        color: dt('listbox.checkmark.color');\n    }\n\n    .p-listbox-option-group {\n        margin: 0;\n        padding: dt('listbox.option.group.padding');\n        color: dt('listbox.option.group.color');\n        background: dt('listbox.option.group.background');\n        font-weight: dt('listbox.option.group.font.weight');\n    }\n\n    .p-listbox-empty-message {\n        padding: dt('listbox.empty.message.padding');\n    }\n\n    .p-listbox-fluid {\n        width: 100%;\n    }\n";

// node_modules/primeng/fesm2022/primeng-listbox.mjs
var _c0 = ["item"];
var _c1 = ["group"];
var _c2 = ["header"];
var _c3 = ["filter"];
var _c4 = ["footer"];
var _c5 = ["emptyfilter"];
var _c6 = ["empty"];
var _c7 = ["filtericon"];
var _c8 = ["checkicon"];
var _c9 = ["checkmark"];
var _c10 = ["loader"];
var _c11 = ["headerchkbox"];
var _c12 = ["lastHiddenFocusableElement"];
var _c13 = ["firstHiddenFocusableElement"];
var _c14 = ["scroller"];
var _c15 = ["list"];
var _c16 = ["container"];
var _c17 = [[["p-header"]], [["p-footer"]]];
var _c18 = ["p-header", "p-footer"];
var _c19 = (a0, a1) => ({
  $implicit: a0,
  options: a1
});
var _c20 = (a0) => ({
  "p-checkbox-disabled": a0
});
var _c21 = (a0) => ({
  $implicit: a0
});
var _c22 = (a0) => ({
  options: a0
});
var _c23 = () => [];
var _c24 = (a0) => ({
  height: a0
});
var _c25 = () => ({});
var _c26 = (a0, a1, a2) => ({
  option: a0,
  i: a1,
  scrollerOptions: a2
});
var _c27 = (a0, a1, a2, a3) => ({
  $implicit: a0,
  index: a1,
  selected: a2,
  disabled: a3
});
var _c28 = (a0) => ({
  implicit: a0
});
function Listbox_div_2_ng_container_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_div_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div");
    ɵɵprojection(1);
    ɵɵtemplate(2, Listbox_div_2_ng_container_2_Template, 1, 0, "ng-container", 21);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵclassMap(ctx_r1.cx("header"));
    ɵɵadvance(2);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.headerTemplate || ctx_r1._headerTemplate)("ngTemplateOutletContext", ɵɵpureFunction2(4, _c19, ctx_r1.modelValue(), ctx_r1.visibleOptions()));
  }
}
function Listbox_div_3_div_1_p_checkbox_4_ng_container_1_ng_template_1_0_ng_template_0_Template(rf, ctx) {
}
function Listbox_div_3_div_1_p_checkbox_4_ng_container_1_ng_template_1_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_div_3_div_1_p_checkbox_4_ng_container_1_ng_template_1_0_ng_template_0_Template, 0, 0, "ng-template");
  }
}
function Listbox_div_3_div_1_p_checkbox_4_ng_container_1_ng_template_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_div_3_div_1_p_checkbox_4_ng_container_1_ng_template_1_0_Template, 1, 0, null, 21);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(5);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.checkIconTemplate || ctx_r1._checkIconTemplate)("ngTemplateOutletContext", ɵɵpureFunction1(2, _c21, ctx_r1.allSelected()));
  }
}
function Listbox_div_3_div_1_p_checkbox_4_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, Listbox_div_3_div_1_p_checkbox_4_ng_container_1_ng_template_1_Template, 1, 4, "ng-template", null, 5, ɵɵtemplateRefExtractor);
    ɵɵelementContainerEnd();
  }
}
function Listbox_div_3_div_1_p_checkbox_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "p-checkbox", 28);
    ɵɵtemplate(1, Listbox_div_3_div_1_p_checkbox_4_ng_container_1_Template, 3, 0, "ng-container", 18);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵclassMap(ctx_r1.cx("optionCheckIcon"));
    ɵɵproperty("ngModel", ctx_r1.allSelected())("disabled", ctx_r1.$disabled())("tabindex", -1)("variant", ctx_r1.config.inputStyle() === "filled" || ctx_r1.config.inputVariant() === "filled" ? "filled" : "outlined")("binary", true);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.checkIconTemplate || ctx_r1._checkIconTemplate);
  }
}
function Listbox_div_3_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div", 24);
    ɵɵlistener("click", function Listbox_div_3_div_1_Template_div_click_0_listener($event) {
      ɵɵrestoreView(_r3);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onToggleAll($event));
    })("keydown", function Listbox_div_3_div_1_Template_div_keydown_0_listener($event) {
      ɵɵrestoreView(_r3);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onHeaderCheckboxKeyDown($event));
    });
    ɵɵelementStart(1, "div", 25)(2, "input", 26, 4);
    ɵɵlistener("focus", function Listbox_div_3_div_1_Template_input_focus_2_listener($event) {
      ɵɵrestoreView(_r3);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onHeaderCheckboxFocus($event));
    })("blur", function Listbox_div_3_div_1_Template_input_blur_2_listener() {
      ɵɵrestoreView(_r3);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onHeaderCheckboxBlur());
    });
    ɵɵelementEnd()();
    ɵɵtemplate(4, Listbox_div_3_div_1_p_checkbox_4_Template, 2, 8, "p-checkbox", 27);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵproperty("ngClass", ɵɵpureFunction1(6, _c20, ctx_r1.$disabled()));
    ɵɵadvance();
    ɵɵattribute("data-p-hidden-accessible", true);
    ɵɵadvance();
    ɵɵattribute("checked", ctx_r1.allSelected())("disabled", ctx_r1.$disabled() ? "" : void 0)("aria-label", ctx_r1.toggleAllAriaLabel);
    ɵɵadvance(2);
    ɵɵproperty("ngIf", ctx_r1.checkbox && ctx_r1.multiple);
  }
}
function Listbox_div_3_ng_container_2_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_div_3_ng_container_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, Listbox_div_3_ng_container_2_ng_container_1_Template, 1, 0, "ng-container", 21);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", ctx_r1.filterTemplate || ctx_r1._filterTemplate)("ngTemplateOutletContext", ɵɵpureFunction1(2, _c22, ctx_r1.filterOptions));
  }
}
function Listbox_div_3_ng_template_3_div_0__svg_svg_5_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelement(0, "svg", 32);
  }
  if (rf & 2) {
    ɵɵattribute("aria-hidden", true);
  }
}
function Listbox_div_3_ng_template_3_div_0_span_6_1_ng_template_0_Template(rf, ctx) {
}
function Listbox_div_3_ng_template_3_div_0_span_6_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_div_3_ng_template_3_div_0_span_6_1_ng_template_0_Template, 0, 0, "ng-template");
  }
}
function Listbox_div_3_ng_template_3_div_0_span_6_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span");
    ɵɵtemplate(1, Listbox_div_3_ng_template_3_div_0_span_6_1_Template, 1, 0, null, 33);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(4);
    ɵɵattribute("aria-hidden", true);
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", ctx_r1.filterIconTemplate || ctx_r1._filterIconTemplate);
  }
}
function Listbox_div_3_ng_template_3_div_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div")(1, "p-iconfield")(2, "input", 30, 6);
    ɵɵlistener("input", function Listbox_div_3_ng_template_3_div_0_Template_input_input_2_listener($event) {
      ɵɵrestoreView(_r4);
      const ctx_r1 = ɵɵnextContext(3);
      return ɵɵresetView(ctx_r1.onFilterChange($event));
    })("keydown", function Listbox_div_3_ng_template_3_div_0_Template_input_keydown_2_listener($event) {
      ɵɵrestoreView(_r4);
      const ctx_r1 = ɵɵnextContext(3);
      return ɵɵresetView(ctx_r1.onFilterKeyDown($event));
    })("blur", function Listbox_div_3_ng_template_3_div_0_Template_input_blur_2_listener($event) {
      ɵɵrestoreView(_r4);
      const ctx_r1 = ɵɵnextContext(3);
      return ɵɵresetView(ctx_r1.onFilterBlur($event));
    });
    ɵɵelementEnd();
    ɵɵelementStart(4, "p-inputicon");
    ɵɵtemplate(5, Listbox_div_3_ng_template_3_div_0__svg_svg_5_Template, 1, 1, "svg", 31)(6, Listbox_div_3_ng_template_3_div_0_span_6_Template, 2, 2, "span", 18);
    ɵɵelementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵadvance(2);
    ɵɵclassMap(ctx_r1.cx("pcFilter"));
    ɵɵproperty("value", ctx_r1._filterValue() || "");
    ɵɵattribute("disabled", ctx_r1.$disabled() ? "" : void 0)("aria-owns", ctx_r1.id + "_list")("aria-activedescendant", ctx_r1.focusedOptionId)("placeholder", ctx_r1.filterPlaceHolder)("aria-label", ctx_r1.ariaFilterLabel)("tabindex", !ctx_r1.$disabled() && !ctx_r1.focused ? ctx_r1.tabindex : -1);
    ɵɵadvance(3);
    ɵɵproperty("ngIf", !ctx_r1.filterIconTemplate && !ctx_r1._filterIconTemplate);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.filterIconTemplate || ctx_r1._filterIconTemplate);
  }
}
function Listbox_div_3_ng_template_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_div_3_ng_template_3_div_0_Template, 7, 11, "div", 18);
    ɵɵelementStart(1, "span", 29);
    ɵɵtext(2);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵproperty("ngIf", ctx_r1.filter);
    ɵɵadvance();
    ɵɵattribute("aria-live", "polite")("data-p-hidden-accessible", true);
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", ctx_r1.filterResultMessageText, " ");
  }
}
function Listbox_div_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div");
    ɵɵtemplate(1, Listbox_div_3_div_1_Template, 5, 8, "div", 22)(2, Listbox_div_3_ng_container_2_Template, 2, 4, "ng-container", 23)(3, Listbox_div_3_ng_template_3_Template, 3, 4, "ng-template", null, 3, ɵɵtemplateRefExtractor);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const builtInFilterElement_r5 = ɵɵreference(4);
    const ctx_r1 = ɵɵnextContext();
    ɵɵclassMap(ctx_r1.cx("header"));
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.checkbox && ctx_r1.multiple && ctx_r1.showToggleAll);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.filterTemplate || ctx_r1._filterTemplate)("ngIfElse", builtInFilterElement_r5);
  }
}
function Listbox_Conditional_6_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtext(0);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵtextInterpolate1(" ", ctx_r1.emptyFilterMessageText, " ");
  }
}
function Listbox_Conditional_6_Conditional_2_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0, null, 7);
  }
}
function Listbox_Conditional_6_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_6_Conditional_2_ng_container_0_Template, 2, 0, "ng-container", 33);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.emptyFilterTemplate || ctx_r1._emptyFilterTemplate || ctx_r1._emptyTemplate || ctx_r1.emptyTemplate);
  }
}
function Listbox_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div", 34);
    ɵɵlistener("cdkDropListDropped", function Listbox_Conditional_6_Template_div_cdkDropListDropped_0_listener($event) {
      ɵɵrestoreView(_r6);
      const ctx_r1 = ɵɵnextContext();
      return ɵɵresetView(ctx_r1.drop($event));
    });
    ɵɵconditionalCreate(1, Listbox_Conditional_6_Conditional_1_Template, 1, 1)(2, Listbox_Conditional_6_Conditional_2_Template, 1, 1, "ng-container");
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵclassMap(ctx_r1.cx("emptyMessage"));
    ɵɵproperty("cdkDropListData", ɵɵpureFunction0(4, _c23));
    ɵɵadvance();
    ɵɵconditional(!ctx_r1.emptyFilterTemplate && !ctx_r1._emptyFilterTemplate && !ctx_r1._emptyTemplate && !ctx_r1.emptyTemplate ? 1 : 2);
  }
}
function Listbox_Conditional_7_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtext(0);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵtextInterpolate1(" ", ctx_r1.emptyMessage, " ");
  }
}
function Listbox_Conditional_7_Conditional_2_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0, null, 8);
  }
}
function Listbox_Conditional_7_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_7_Conditional_2_ng_container_0_Template, 2, 0, "ng-container", 33);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.emptyTemplate || ctx_r1._emptyTemplate);
  }
}
function Listbox_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div", 34);
    ɵɵlistener("cdkDropListDropped", function Listbox_Conditional_7_Template_div_cdkDropListDropped_0_listener($event) {
      ɵɵrestoreView(_r7);
      const ctx_r1 = ɵɵnextContext();
      return ɵɵresetView(ctx_r1.drop($event));
    });
    ɵɵconditionalCreate(1, Listbox_Conditional_7_Conditional_1_Template, 1, 1)(2, Listbox_Conditional_7_Conditional_2_Template, 1, 1, "ng-container");
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵclassMap(ctx_r1.cx("emptyMessage"));
    ɵɵproperty("cdkDropListData", ɵɵpureFunction0(4, _c23));
    ɵɵadvance();
    ɵɵconditional(!ctx_r1.emptyTemplate && !ctx_r1._emptyTemplate ? 1 : 2);
  }
}
function Listbox_Conditional_8_p_scroller_0_ng_template_2_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_Conditional_8_p_scroller_0_ng_template_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_8_p_scroller_0_ng_template_2_ng_container_0_Template, 1, 0, "ng-container", 21);
  }
  if (rf & 2) {
    const items_r9 = ctx.$implicit;
    const scrollerOptions_r10 = ctx.options;
    ɵɵnextContext(2);
    const buildInItems_r11 = ɵɵreference(3);
    ɵɵproperty("ngTemplateOutlet", buildInItems_r11)("ngTemplateOutletContext", ɵɵpureFunction2(2, _c19, items_r9, scrollerOptions_r10));
  }
}
function Listbox_Conditional_8_p_scroller_0_Conditional_4_ng_template_0_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_Conditional_8_p_scroller_0_Conditional_4_ng_template_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_8_p_scroller_0_Conditional_4_ng_template_0_ng_container_0_Template, 1, 0, "ng-container", 21);
  }
  if (rf & 2) {
    const scrollerOptions_r12 = ctx.options;
    const ctx_r1 = ɵɵnextContext(4);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.loaderTemplate || ctx_r1._loaderTemplate)("ngTemplateOutletContext", ɵɵpureFunction1(2, _c22, scrollerOptions_r12));
  }
}
function Listbox_Conditional_8_p_scroller_0_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_8_p_scroller_0_Conditional_4_ng_template_0_Template, 1, 4, "ng-template", null, 12, ɵɵtemplateRefExtractor);
  }
}
function Listbox_Conditional_8_p_scroller_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "p-scroller", 36, 10);
    ɵɵlistener("onLazyLoad", function Listbox_Conditional_8_p_scroller_0_Template_p_scroller_onLazyLoad_0_listener($event) {
      ɵɵrestoreView(_r8);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onLazyLoad.emit($event));
    });
    ɵɵtemplate(2, Listbox_Conditional_8_p_scroller_0_ng_template_2_Template, 1, 5, "ng-template", null, 11, ɵɵtemplateRefExtractor);
    ɵɵconditionalCreate(4, Listbox_Conditional_8_p_scroller_0_Conditional_4_Template, 2, 0);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵstyleMap(ɵɵpureFunction1(9, _c24, ctx_r1.scrollHeight));
    ɵɵproperty("items", ctx_r1.visibleOptions())("itemSize", ctx_r1.virtualScrollItemSize)("autoSize", true)("lazy", ctx_r1.lazy)("options", ctx_r1.virtualScrollOptions)("tabindex", ctx_r1.scrollerTabIndex);
    ɵɵadvance(4);
    ɵɵconditional(ctx_r1.loaderTemplate || ctx_r1._loaderTemplate ? 4 : -1);
  }
}
function Listbox_Conditional_8_ng_container_1_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_Conditional_8_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, Listbox_Conditional_8_ng_container_1_ng_container_1_Template, 1, 0, "ng-container", 21);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    ɵɵnextContext();
    const buildInItems_r11 = ɵɵreference(3);
    const ctx_r1 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", buildInItems_r11)("ngTemplateOutletContext", ɵɵpureFunction2(3, _c19, ctx_r1.visibleOptions(), ɵɵpureFunction0(2, _c25)));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_0_span_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span");
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const option_r14 = ɵɵnextContext(2).$implicit;
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r1.getOptionGroupLabel(option_r14.optionGroup));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_0_ng_container_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵelementStart(1, "li", 39);
    ɵɵtemplate(2, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_0_span_2_Template, 2, 1, "span", 18)(3, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_0_ng_container_3_Template, 1, 0, "ng-container", 21);
    ɵɵelementEnd();
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r14 = ɵɵnextContext();
    const option_r14 = ctx_r14.$implicit;
    const i_r16 = ctx_r14.index;
    const scrollerOptions_r17 = ɵɵnextContext().options;
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵclassMap(ctx_r1.cx("optionGroup"));
    ɵɵproperty("ngStyle", ɵɵpureFunction1(9, _c24, scrollerOptions_r17.itemSize + "px"))("cdkDragData", option_r14)("cdkDragDisabled", !ctx_r1.dragdrop);
    ɵɵattribute("id", ctx_r1.id + "_" + ctx_r1.getOptionIndex(i_r16, scrollerOptions_r17));
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r1.groupTemplate && !ctx_r1._groupTemplate);
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", ctx_r1.groupTemplate || ctx_r1._groupTemplate)("ngTemplateOutletContext", ɵɵpureFunction1(11, _c21, option_r14.optionGroup));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_ng_template_1_0_ng_template_0_Template(rf, ctx) {
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_ng_template_1_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_ng_template_1_0_ng_template_0_Template, 0, 0, "ng-template");
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_ng_template_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_ng_template_1_0_Template, 1, 0, null, 21);
  }
  if (rf & 2) {
    const option_r14 = ɵɵnextContext(4).$implicit;
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.checkIconTemplate || ctx_r1._checkIconTemplate)("ngTemplateOutletContext", ɵɵpureFunction1(2, _c21, ctx_r1.isSelected(option_r14)));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_ng_template_1_Template, 1, 4, "ng-template", null, 5, ɵɵtemplateRefExtractor);
    ɵɵelementContainerEnd();
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "p-checkbox", 42);
    ɵɵtemplate(1, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_ng_container_1_Template, 3, 0, "ng-container", 18);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const option_r14 = ɵɵnextContext(2).$implicit;
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵclassMap(ctx_r1.cx("optionCheckIcon"));
    ɵɵproperty("ngModel", ctx_r1.isSelected(option_r14))("readonly", true)("disabled", ctx_r1.$disabled() || ctx_r1.isOptionDisabled(option_r14))("tabindex", -1)("variant", ctx_r1.config.inputStyle() === "filled" || ctx_r1.config.inputVariant() === "filled" ? "filled" : "outlined")("binary", true);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.checkIconTemplate || ctx_r1._checkIconTemplate);
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_1__svg_svg_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelement(0, "svg", 45);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(7);
    ɵɵclassMap(ctx_r1.cx("optionBlankIcon"));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_1__svg_svg_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelement(0, "svg", 46);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext(7);
    ɵɵclassMap(ctx_r1.cx("optionCheckIcon"));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_1__svg_svg_1_Template, 1, 2, "svg", 43)(2, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_1__svg_svg_2_Template, 1, 2, "svg", 44);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const option_r14 = ɵɵnextContext(3).$implicit;
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r1.isSelected(option_r14));
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.isSelected(option_r14));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_1_Template, 3, 2, "ng-container", 18)(2, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_ng_container_2_Template, 1, 0, "ng-container", 21);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const option_r14 = ɵɵnextContext(2).$implicit;
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r1.checkmarkTemplate && !ctx_r1._checkmarkTemplate);
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", ctx_r1.checkmarkTemplate || ctx_r1._checkmarkTemplate)("ngTemplateOutletContext", ɵɵpureFunction1(3, _c28, ctx_r1.isSelected(option_r14)));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_span_4_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span");
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const option_r14 = ɵɵnextContext(2).$implicit;
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵadvance();
    ɵɵtextInterpolate(ctx_r1.getOptionLabel(option_r14));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_5_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = ɵɵgetCurrentView();
    ɵɵelementContainerStart(0);
    ɵɵelementStart(1, "li", 40);
    ɵɵlistener("click", function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_Template_li_click_1_listener($event) {
      ɵɵrestoreView(_r18);
      const ctx_r14 = ɵɵnextContext();
      const option_r14 = ctx_r14.$implicit;
      const i_r16 = ctx_r14.index;
      const scrollerOptions_r17 = ɵɵnextContext().options;
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onOptionSelect($event, option_r14, ctx_r1.getOptionIndex(i_r16, scrollerOptions_r17)));
    })("dblclick", function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_Template_li_dblclick_1_listener($event) {
      ɵɵrestoreView(_r18);
      const option_r14 = ɵɵnextContext().$implicit;
      const ctx_r1 = ɵɵnextContext(3);
      return ɵɵresetView(ctx_r1.onOptionDoubleClick($event, option_r14));
    })("mousedown", function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_Template_li_mousedown_1_listener($event) {
      ɵɵrestoreView(_r18);
      const i_r16 = ɵɵnextContext().index;
      const scrollerOptions_r17 = ɵɵnextContext().options;
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onOptionMouseDown($event, ctx_r1.getOptionIndex(i_r16, scrollerOptions_r17)));
    })("mouseenter", function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_Template_li_mouseenter_1_listener($event) {
      ɵɵrestoreView(_r18);
      const i_r16 = ɵɵnextContext().index;
      const scrollerOptions_r17 = ɵɵnextContext().options;
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onOptionMouseEnter($event, ctx_r1.getOptionIndex(i_r16, scrollerOptions_r17)));
    })("touchend", function Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_Template_li_touchend_1_listener() {
      ɵɵrestoreView(_r18);
      const ctx_r1 = ɵɵnextContext(4);
      return ɵɵresetView(ctx_r1.onOptionTouchEnd());
    });
    ɵɵtemplate(2, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_p_checkbox_2_Template, 2, 9, "p-checkbox", 41)(3, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_3_Template, 3, 5, "ng-container", 18)(4, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_span_4_Template, 2, 1, "span", 18)(5, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_ng_container_5_Template, 1, 0, "ng-container", 21);
    ɵɵelementEnd();
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r14 = ɵɵnextContext();
    const option_r14 = ctx_r14.$implicit;
    const i_r16 = ctx_r14.index;
    const scrollerOptions_r17 = ɵɵnextContext().options;
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵadvance();
    ɵɵclassMap(ctx_r1.cx("option", ɵɵpureFunction3(18, _c26, option_r14, i_r16, scrollerOptions_r17)));
    ɵɵproperty("ngStyle", ɵɵpureFunction1(22, _c24, scrollerOptions_r17.itemSize + "px"))("cdkDragData", option_r14)("cdkDragDisabled", !ctx_r1.dragdrop);
    ɵɵattribute("id", ctx_r1.id + "_" + ctx_r1.getOptionIndex(i_r16, scrollerOptions_r17))("aria-label", ctx_r1.getOptionLabel(option_r14))("aria-selected", ctx_r1.isSelected(option_r14))("aria-disabled", ctx_r1.isOptionDisabled(option_r14))("aria-setsize", ctx_r1.ariaSetSize)("ariaPosInset", ctx_r1.getAriaPosInset(ctx_r1.getOptionIndex(i_r16, scrollerOptions_r17)))("data-pc-section", "item")("data-p-selected", ctx_r1.isSelected(option_r14));
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.checkbox && ctx_r1.multiple);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r1.checkmark);
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r1.itemTemplate && !ctx_r1._itemTemplate);
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", ctx_r1.itemTemplate || ctx_r1._itemTemplate)("ngTemplateOutletContext", ɵɵpureFunction4(24, _c27, option_r14, ctx_r1.getOptionIndex(i_r16, scrollerOptions_r17), ctx_r1.isSelected(option_r14), ctx_r1.isOptionDisabled(option_r14)));
  }
}
function Listbox_Conditional_8_ng_template_2_ng_template_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_0_Template, 4, 13, "ng-container", 18)(1, Listbox_Conditional_8_ng_template_2_ng_template_2_ng_container_1_Template, 6, 29, "ng-container", 18);
  }
  if (rf & 2) {
    const option_r14 = ctx.$implicit;
    const ctx_r1 = ɵɵnextContext(3);
    ɵɵproperty("ngIf", ctx_r1.isOptionGroup(option_r14));
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r1.isOptionGroup(option_r14));
  }
}
function Listbox_Conditional_8_ng_template_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "ul", 37, 13);
    ɵɵlistener("focus", function Listbox_Conditional_8_ng_template_2_Template_ul_focus_0_listener($event) {
      ɵɵrestoreView(_r13);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onListFocus($event));
    })("blur", function Listbox_Conditional_8_ng_template_2_Template_ul_blur_0_listener($event) {
      ɵɵrestoreView(_r13);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onListBlur($event));
    })("keydown", function Listbox_Conditional_8_ng_template_2_Template_ul_keydown_0_listener($event) {
      ɵɵrestoreView(_r13);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.onListKeyDown($event));
    })("cdkDropListDropped", function Listbox_Conditional_8_ng_template_2_Template_ul_cdkDropListDropped_0_listener($event) {
      ɵɵrestoreView(_r13);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1.drop($event));
    });
    ɵɵtemplate(2, Listbox_Conditional_8_ng_template_2_ng_template_2_Template, 2, 2, "ng-template", 38);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const items_r19 = ctx.$implicit;
    const scrollerOptions_r17 = ctx.options;
    const ctx_r1 = ɵɵnextContext(2);
    ɵɵstyleMap(scrollerOptions_r17.contentStyle);
    ɵɵclassMap(ctx_r1.cx("list"));
    ɵɵproperty("tabindex", -1)("ngClass", scrollerOptions_r17.contentStyleClass)("cdkDropListData", items_r19);
    ɵɵattribute("aria-multiselectable", true)("aria-activedescendant", ctx_r1.focused ? ctx_r1.focusedOptionId : void 0)("aria-label", ctx_r1.ariaLabel)("aria-disabled", ctx_r1.$disabled());
    ɵɵadvance(2);
    ɵɵproperty("ngForOf", items_r19);
  }
}
function Listbox_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵtemplate(0, Listbox_Conditional_8_p_scroller_0_Template, 5, 11, "p-scroller", 35)(1, Listbox_Conditional_8_ng_container_1_Template, 2, 6, "ng-container", 18)(2, Listbox_Conditional_8_ng_template_2_Template, 3, 12, "ng-template", null, 9, ɵɵtemplateRefExtractor);
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵproperty("ngIf", ctx_r1.virtualScroll);
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r1.virtualScroll);
  }
}
function Listbox_div_9_ng_container_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function Listbox_div_9_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "div");
    ɵɵprojection(1, 1);
    ɵɵtemplate(2, Listbox_div_9_ng_container_2_Template, 1, 0, "ng-container", 21);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵadvance(2);
    ɵɵproperty("ngTemplateOutlet", ctx_r1.footerTemplate || ctx_r1._footerTemplate)("ngTemplateOutletContext", ɵɵpureFunction2(2, _c19, ctx_r1.modelValue(), ctx_r1.visibleOptions()));
  }
}
function Listbox_span_10_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementStart(0, "span", 20);
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵtextInterpolate1(" ", ctx_r1.emptyMessage, " ");
  }
}
var theme = (
  /*css*/
  `
    ${style}

    /* For PrimeNG */
    .p-listbox.ng-invalid.ng-dirty {
        border-color: dt('listbox.invalid.border.color');
    }
`
);
var classes = {
  root: ({
    instance
  }) => ["p-listbox p-component", {
    "p-listbox-striped": instance.striped,
    "p-disabled": instance.$disabled(),
    "p-invalid": instance.invalid(),
    "p-listbox-fluid": instance.fluid()
  }],
  header: "p-listbox-header",
  pcFilter: "p-listbox-filter",
  listContainer: "p-listbox-list-container",
  list: "p-listbox-list",
  optionGroup: "p-listbox-option-group",
  option: ({
    instance,
    option,
    i,
    scrollerOptions
  }) => ["p-listbox-option", {
    "p-listbox-option-selected": instance.isSelected(option) && instance.highlightOnSelect,
    "p-focus": instance.focusedOptionIndex() === instance.getOptionIndex(i, scrollerOptions),
    "p-disabled": instance.isOptionDisabled(option)
  }],
  optionCheckIcon: "p-listbox-option-check-icon",
  optionBlankIcon: "p-listbox-option-blank-icon",
  emptyMessage: "p-listbox-empty-message"
};
var ListBoxStyle = class _ListBoxStyle extends BaseStyle {
  name = "listbox";
  theme = theme;
  classes = classes;
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵListBoxStyle_BaseFactory;
    return function ListBoxStyle_Factory(__ngFactoryType__) {
      return (ɵListBoxStyle_BaseFactory || (ɵListBoxStyle_BaseFactory = ɵɵgetInheritedFactory(_ListBoxStyle)))(__ngFactoryType__ || _ListBoxStyle);
    };
  })();
  static ɵprov = ɵɵdefineInjectable({
    token: _ListBoxStyle,
    factory: _ListBoxStyle.ɵfac
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ListBoxStyle, [{
    type: Injectable
  }], null, null);
})();
var ListboxClasses;
(function(ListboxClasses2) {
  ListboxClasses2["root"] = "p-listbox";
  ListboxClasses2["header"] = "p-listbox-header";
  ListboxClasses2["pcFilter"] = "p-listbox-filter";
  ListboxClasses2["listContainer"] = "p-listbox-list-container";
  ListboxClasses2["list"] = "p-listbox-list";
  ListboxClasses2["optionGroup"] = "p-listbox-option-group";
  ListboxClasses2["option"] = "p-listbox-option";
  ListboxClasses2["optionCheckIcon"] = "p-listbox-option-check-icon";
  ListboxClasses2["optionBlankIcon"] = "p-listbox-option-blank-icon";
  ListboxClasses2["emptyMessage"] = "p-listbox-empty-message";
})(ListboxClasses || (ListboxClasses = {}));
var LISTBOX_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => Listbox),
  multi: true
};
var Listbox = class _Listbox extends BaseEditableHolder {
  filterService;
  /**
   * Unique identifier of the component.
   * @group Props
   */
  id;
  /**
   * Text to display when the search is active. Defaults to global value in i18n translation configuration.
   * @group Props
   * @defaultValue '{0} results are available'
   */
  searchMessage;
  /**
   * Text to display when filtering does not return any results. Defaults to global value in i18n translation configuration.
   * @group Props
   * @defaultValue 'No selected item'
   */
  emptySelectionMessage;
  /**
   * Text to be displayed in hidden accessible field when options are selected. Defaults to global value in i18n translation configuration.
   * @group Props
   * @defaultValue '{0} items selected'
   */
  selectionMessage;
  /**
   * Whether to focus on the first visible or selected element when the overlay panel is shown.
   * @group Props
   */
  autoOptionFocus = true;
  /**
   * Defines a string that labels the input for accessibility.
   * @group Props
   */
  ariaLabel;
  /**
   * When enabled, the focused option is selected.
   * @group Props
   */
  selectOnFocus;
  /**
   * Locale to use in searching. The default locale is the host environment's current locale.
   * @group Props
   */
  searchLocale;
  /**
   * When enabled, the hovered option will be focused.
   * @group Props
   */
  focusOnHover = true;
  /**
   * Text to display when filtering.
   * @group Props
   */
  filterMessage;
  /**
   * Fields used when filtering the options, defaults to optionLabel.
   * @group Props
   */
  filterFields;
  /**
   * Defines if data is loaded and interacted with in lazy manner.
   * @group Props
   */
  lazy = false;
  /**
   * Whether the data should be loaded on demand during scroll.
   * @group Props
   */
  virtualScroll;
  /**
   * Height of an item in the list for VirtualScrolling.
   * @group Props
   */
  virtualScrollItemSize;
  /**
   * Whether to use the scroller feature. The properties of scroller component can be used like an object in it.
   * @group Props
   */
  virtualScrollOptions;
  /**
   * Height of the viewport in pixels, a scrollbar is defined if height of list exceeds this value.
   * @group Props
   */
  scrollHeight = "14rem";
  /**
   * Index of the element in tabbing order.
   * @group Props
   */
  tabindex = 0;
  /**
   * When specified, allows selecting multiple values.
   * @group Props
   */
  multiple;
  /**
   * Style class of the container.
   * @deprecated since v20.0.0, use `class` instead.
   * @group Props
   */
  styleClass;
  /**
   * Inline style of the list element.
   * @group Props
   */
  listStyle;
  /**
   * Style class of the list element.
   * @group Props
   */
  listStyleClass;
  /**
   * When present, it specifies that the element value cannot be changed.
   * @group Props
   */
  readonly;
  /**
   * When specified, allows selecting items with checkboxes.
   * @group Props
   */
  checkbox = false;
  /**
   * When specified, displays a filter input at header.
   * @group Props
   */
  filter = false;
  /**
   * When filtering is enabled, filterBy decides which field or fields (comma separated) to search against.
   * @group Props
   */
  filterBy;
  /**
   * Defines how the items are filtered.
   * @group Props
   */
  filterMatchMode = "contains";
  /**
   * Locale to use in filtering. The default locale is the host environment's current locale.
   * @group Props
   */
  filterLocale;
  /**
   * Defines how multiple items can be selected, when true metaKey needs to be pressed to select or unselect an item and when set to false selection of each item can be toggled individually. On touch enabled devices, metaKeySelection is turned off automatically.
   * @group Props
   */
  metaKeySelection = false;
  /**
   * A property to uniquely identify a value in options.
   * @group Props
   */
  dataKey;
  /**
   * Whether header checkbox is shown in multiple mode.
   * @group Props
   */
  showToggleAll = true;
  /**
   * Name of the label field of an option.
   * @group Props
   */
  optionLabel;
  /**
   * Name of the value field of an option.
   * @group Props
   */
  optionValue;
  /**
   * Name of the options field of an option group.
   * @group Props
   */
  optionGroupChildren = "items";
  /**
   * Name of the label field of an option group.
   * @group Props
   */
  optionGroupLabel = "label";
  /**
   * Name of the disabled field of an option or function to determine disabled state.
   * @group Props
   */
  optionDisabled;
  /**
   * Defines a string that labels the filter input.
   * @group Props
   */
  ariaFilterLabel;
  /**
   * Defines placeholder of the filter input.
   * @group Props
   */
  filterPlaceHolder;
  /**
   * Text to display when filtering does not return any results.
   * @group Props
   */
  emptyFilterMessage;
  /**
   * Text to display when there is no data. Defaults to global value in i18n translation configuration.
   * @group Props
   */
  emptyMessage;
  /**
   * Whether to display options as grouped when nested options are provided.
   * @group Props
   */
  group;
  /**
   * An array of selectitems to display as the available options.
   * @group Props
   */
  get options() {
    return this._options();
  }
  set options(val) {
    this._options.set(val);
  }
  /**
   * When specified, filter displays with this value.
   * @group Props
   */
  get filterValue() {
    return this._filterValue();
  }
  set filterValue(val) {
    this._filterValue.set(val);
  }
  /**
   * Whether all data is selected.
   * @group Props
   */
  get selectAll() {
    return this._selectAll;
  }
  set selectAll(value) {
    this._selectAll = value;
  }
  /**
   * Whether to displays rows with alternating colors.
   * @group Props
   * @defaultValue false
   */
  striped = false;
  /**
   * Whether the selected option will be add highlight class.
   * @group Props
   * @defaultValue true
   */
  highlightOnSelect = true;
  /**
   * Whether the selected option will be shown with a check mark.
   * @group Props
   * @defaultValue false
   */
  checkmark = false;
  /**
   * Whether to enable dragdrop based reordering.
   * @group Props
   */
  dragdrop = false;
  /**
   * Spans 100% width of the container when enabled.
   * @defaultValue undefined
   * @group Props
   */
  fluid = input(void 0, ...ngDevMode ? [{
    debugName: "fluid",
    transform: booleanAttribute
  }] : [{
    transform: booleanAttribute
  }]);
  /**
   * Callback to invoke on value change.
   * @param {ListboxChangeEvent} event - Custom change event.
   * @group Emits
   */
  onChange = new EventEmitter();
  /**
   * Callback to invoke when option is clicked.
   * @param {ListboxClickEvent} event - Custom click event.
   * @group Emits
   */
  onClick = new EventEmitter();
  /**
   * Callback to invoke when option is double clicked.
   * @param {ListboxDoubleClickEvent} event - Custom double click event.
   * @group Emits
   */
  onDblClick = new EventEmitter();
  /**
   * Callback to invoke when data is filtered.
   * @param {ListboxFilterEvent} event - Custom filter event.
   * @group Emits
   */
  onFilter = new EventEmitter();
  /**
   * Callback to invoke when component receives focus.
   * @param {FocusEvent} event - Focus event.
   * @group Emits
   */
  onFocus = new EventEmitter();
  /**
   * Callback to invoke when component loses focus.
   * @param {FocusEvent} event - Blur event.
   * @group Emits
   */
  onBlur = new EventEmitter();
  /**
   * Callback to invoke when all data is selected.
   * @param {ListboxSelectAllChangeEvent} event - Custom select event.
   * @group Emits
   */
  onSelectAllChange = new EventEmitter();
  /**
   * Emits on lazy load.
   * @param {ScrollerLazyLoadEvent} event - Scroller lazy load event.
   * @group Emits
   */
  onLazyLoad = new EventEmitter();
  /**
   * Emits on item is dropped.
   * @param {CdkDragDrop<string[]>} event - Scroller lazy load event.
   * @group Emits
   */
  onDrop = new EventEmitter();
  headerCheckboxViewChild;
  filterViewChild;
  lastHiddenFocusableElement;
  firstHiddenFocusableElement;
  scroller;
  listViewChild;
  containerViewChild;
  headerFacet;
  footerFacet;
  /**
   * Custom item template.
   * @group Templates
   */
  itemTemplate;
  /**
   * Custom group template.
   * @group Templates
   */
  groupTemplate;
  /**
   * Custom header template.
   * @group Templates
   */
  headerTemplate;
  /**
   * Custom filter template.
   * @group Templates
   */
  filterTemplate;
  /**
   * Custom footer template.
   * @group Templates
   */
  footerTemplate;
  /**
   * Custom empty filter message template.
   * @group Templates
   */
  emptyFilterTemplate;
  /**
   * Custom empty message template.
   * @group Templates
   */
  emptyTemplate;
  /**
   * Custom filter icon template.
   * @group Templates
   */
  filterIconTemplate;
  /**
   * Custom check icon template.
   * @group Templates
   */
  checkIconTemplate;
  /**
   * Custom checkmark icon template.
   * @group Templates
   */
  checkmarkTemplate;
  /**
   * Custom loader template.
   * @group Templates
   */
  loaderTemplate;
  templates;
  _itemTemplate;
  _groupTemplate;
  _headerTemplate;
  _filterTemplate;
  _footerTemplate;
  _emptyFilterTemplate;
  _emptyTemplate;
  _filterIconTemplate;
  _checkIconTemplate;
  _checkmarkTemplate;
  _loaderTemplate;
  _filterValue = signal(null, ...ngDevMode ? [{
    debugName: "_filterValue"
  }] : []);
  _filteredOptions;
  filterOptions;
  filtered;
  value;
  optionTouched;
  focus;
  headerCheckboxFocus;
  translationSubscription;
  focused;
  scrollerTabIndex = "0";
  _componentStyle = inject(ListBoxStyle);
  get focusedOptionId() {
    return this.focusedOptionIndex() !== -1 ? `${this.id}_${this.focusedOptionIndex()}` : null;
  }
  get filterResultMessageText() {
    return s(this.visibleOptions()) ? this.filterMessageText.replaceAll("{0}", this.visibleOptions().length) : this.emptyFilterMessageText;
  }
  get filterMessageText() {
    return this.filterMessage || this.config.translation.searchMessage || "";
  }
  get searchMessageText() {
    return this.searchMessage || this.config.translation.searchMessage || "";
  }
  get emptyFilterMessageText() {
    return this.emptyFilterMessage || this.config.translation.emptySearchMessage || this.config.translation.emptyFilterMessage || "";
  }
  get selectionMessageText() {
    return this.selectionMessage || this.config.translation.selectionMessage || "";
  }
  get emptySelectionMessageText() {
    return this.emptySelectionMessage || this.config.translation.emptySelectionMessage || "";
  }
  get selectedMessageText() {
    return this.hasSelectedOption() ? this.selectionMessageText.replaceAll("{0}", this.multiple ? this.modelValue().length : "1") : this.emptySelectionMessageText;
  }
  get ariaSetSize() {
    return this.visibleOptions().filter((option) => !this.isOptionGroup(option)).length;
  }
  get virtualScrollerDisabled() {
    return !this.virtualScroll;
  }
  get searchFields() {
    return this.filterBy?.split(",") || this.filterFields || [this.optionLabel];
  }
  get toggleAllAriaLabel() {
    return this.config.translation.aria ? this.config.translation.aria[this.allSelected() ? "selectAll" : "unselectAll"] : void 0;
  }
  searchValue;
  searchTimeout;
  _selectAll = null;
  _options = signal(null, ...ngDevMode ? [{
    debugName: "_options"
  }] : []);
  startRangeIndex = signal(-1, ...ngDevMode ? [{
    debugName: "startRangeIndex"
  }] : []);
  focusedOptionIndex = signal(-1, ...ngDevMode ? [{
    debugName: "focusedOptionIndex"
  }] : []);
  onHostFocusOut(event) {
    this.onFocusout(event);
  }
  visibleOptions = computed(() => {
    const options = this.group ? this.flatOptions(this._options()) : this._options() || [];
    return this._filterValue() ? this.filterService.filter(options, this.searchFields, this._filterValue(), this.filterMatchMode, this.filterLocale) : options;
  }, ...ngDevMode ? [{
    debugName: "visibleOptions"
  }] : []);
  constructor(filterService) {
    super();
    this.filterService = filterService;
  }
  ngOnInit() {
    super.ngOnInit();
    this.id = this.id || s2("pn_id_");
    this.translationSubscription = this.config.translationObserver.subscribe(() => {
      this.cd.markForCheck();
    });
    this.autoUpdateModel();
    if (this.filterBy) {
      this.filterOptions = {
        filter: (value) => this.onFilterChange(value),
        reset: () => this.resetFilter()
      };
    }
  }
  ngAfterContentInit() {
    this.templates.forEach((item) => {
      switch (item.getType()) {
        case "item":
          this._itemTemplate = item.template;
          break;
        case "group":
          this._groupTemplate = item.template;
          break;
        case "header":
          this._headerTemplate = item.template;
          break;
        case "filter":
          this._filterTemplate = item.template;
          break;
        case "footer":
          this._footerTemplate = item.template;
          break;
        case "empty":
          this._emptyTemplate = item.template;
          break;
        case "emptyfilter":
          this._emptyFilterTemplate = item.template;
          break;
        case "filtericon":
          this._filterIconTemplate = item.template;
          break;
        case "checkicon":
          this._checkIconTemplate = item.template;
          break;
        case "checkmark":
          this._checkmarkTemplate = item.template;
          break;
        case "loader":
          this._loaderTemplate = item.template;
          break;
        default:
          this._itemTemplate = item.template;
          break;
      }
    });
  }
  flatOptions(options) {
    return (options || []).reduce((result, option, index) => {
      result.push({
        optionGroup: option,
        group: true,
        index
      });
      const optionGroupChildren = this.getOptionGroupChildren(option);
      optionGroupChildren && optionGroupChildren.forEach((o) => result.push(o));
      return result;
    }, []);
  }
  autoUpdateModel() {
    if (this.selectOnFocus && this.autoOptionFocus && !this.hasSelectedOption() && !this.multiple) {
      const focusedOptionIndex = this.findFirstFocusedOptionIndex();
      this.focusedOptionIndex.set(focusedOptionIndex);
      this.onOptionSelect(null, this.visibleOptions()[this.focusedOptionIndex()]);
    }
  }
  /**
   * Updates the model value.
   * @group Method
   */
  updateModel(value, event) {
    this.value = value;
    this.writeModelValue(value);
    this.onModelChange(value);
    this.onChange.emit({
      originalEvent: event,
      value: this.value
    });
  }
  removeOption(option) {
    return this.modelValue().filter((val) => !k(val, this.getOptionValue(option), this.equalityKey()));
  }
  onOptionSelect(event, option, index = -1) {
    if (this.$disabled() || this.isOptionDisabled(option) || this.readonly) {
      return;
    }
    event && this.onClick.emit({
      originalEvent: event,
      option,
      value: this.value
    });
    this.multiple ? this.onOptionSelectMultiple(event, option) : this.onOptionSelectSingle(event, option);
    this.optionTouched = false;
    index !== -1 && this.focusedOptionIndex.set(index);
  }
  onOptionSelectMultiple(event, option) {
    let selected = this.isSelected(option);
    let value = null;
    let metaSelection = this.optionTouched ? false : this.metaKeySelection;
    if (metaSelection) {
      let metaKey = event.metaKey || event.ctrlKey;
      if (selected) {
        value = metaKey ? this.removeOption(option) : [this.getOptionValue(option)];
      } else {
        value = metaKey ? this.modelValue() || [] : [];
        value = [...value, this.getOptionValue(option)];
      }
    } else {
      value = selected ? this.removeOption(option) : [...this.modelValue() || [], this.getOptionValue(option)];
    }
    this.updateModel(value, event);
  }
  onOptionSelectSingle(event, option) {
    let selected = this.isSelected(option);
    let valueChanged = false;
    let value = null;
    let metaSelection = this.optionTouched ? false : this.metaKeySelection;
    if (metaSelection) {
      let metaKey = event.metaKey || event.ctrlKey;
      if (selected) {
        if (metaKey) {
          value = null;
          valueChanged = true;
        }
      } else {
        value = this.getOptionValue(option);
        valueChanged = true;
      }
    } else {
      value = selected ? null : this.getOptionValue(option);
      valueChanged = true;
    }
    if (valueChanged) {
      this.updateModel(value, event);
    }
  }
  onOptionSelectRange(event, start = -1, end = -1) {
    start === -1 && (start = this.findNearestSelectedOptionIndex(end, true));
    end === -1 && (end = this.findNearestSelectedOptionIndex(start));
    if (start !== -1 && end !== -1) {
      const rangeStart = Math.min(start, end);
      const rangeEnd = Math.max(start, end);
      const value = this.visibleOptions().slice(rangeStart, rangeEnd + 1).filter((option) => this.isValidOption(option)).map((option) => this.getOptionValue(option));
      this.updateModel(value, event);
    }
  }
  onToggleAll(event) {
    if (this.$disabled() || this.readonly) {
      return;
    }
    bt(this.headerCheckboxViewChild.nativeElement);
    if (this.selectAll !== null) {
      this.onSelectAllChange.emit({
        originalEvent: event,
        checked: !this.allSelected()
      });
    } else {
      const value = this.allSelected() ? [] : this.visibleOptions().filter((option) => this.isValidOption(option)).map((option) => this.getOptionValue(option));
      this.updateModel(value, event);
      this.onChange.emit({
        originalEvent: event,
        value: this.value
      });
    }
    event.preventDefault();
  }
  allSelected() {
    return this.selectAll !== null ? this.selectAll : s(this.visibleOptions()) && this.visibleOptions().every((option) => this.isOptionGroup(option) || this.isOptionDisabled(option) || this.isSelected(option));
  }
  onOptionTouchEnd() {
    if (this.$disabled()) {
      return;
    }
    this.optionTouched = true;
  }
  onOptionMouseDown(event, index) {
    this.changeFocusedOptionIndex(event, index);
  }
  onOptionMouseEnter(event, index) {
    if (this.focusOnHover && this.focused) {
      this.changeFocusedOptionIndex(event, index);
    }
  }
  onOptionDoubleClick(event, option) {
    if (this.$disabled() || this.isOptionDisabled(option) || this.readonly) {
      return;
    }
    this.onDblClick.emit({
      originalEvent: event,
      option,
      value: this.value
    });
  }
  onFirstHiddenFocus(event) {
    bt(this.listViewChild?.nativeElement);
    const firstFocusableEl = vt(this.el.nativeElement, ':not([data-p-hidden-focusable="true"])');
    this.lastHiddenFocusableElement.nativeElement.tabIndex = a(firstFocusableEl) ? "-1" : void 0;
    this.firstHiddenFocusableElement.nativeElement.tabIndex = -1;
  }
  onLastHiddenFocus(event) {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget === this.listViewChild?.nativeElement) {
      const firstFocusableEl = vt(this.el.nativeElement, ":not(.p-hidden-focusable)");
      bt(firstFocusableEl);
      this.firstHiddenFocusableElement.nativeElement.tabIndex = void 0;
    } else {
      bt(this.firstHiddenFocusableElement.nativeElement);
    }
    this.lastHiddenFocusableElement.nativeElement.tabIndex = -1;
  }
  onFocusout(event) {
    if (!this.el.nativeElement.contains(event.relatedTarget) && this.lastHiddenFocusableElement && this.firstHiddenFocusableElement) {
      this.firstHiddenFocusableElement.nativeElement.tabIndex = this.lastHiddenFocusableElement.nativeElement.tabIndex = void 0;
      this.scrollerTabIndex = "0";
    }
  }
  onListFocus(event) {
    this.focused = true;
    const focusedOptionIndex = this.focusedOptionIndex() !== -1 ? this.focusedOptionIndex() : this.autoOptionFocus ? this.findFirstFocusedOptionIndex() : this.findSelectedOptionIndex();
    this.focusedOptionIndex.set(focusedOptionIndex);
    this.scrollInView(focusedOptionIndex);
    this.onFocus.emit(event);
    this.scrollerTabIndex = "-1";
  }
  onListBlur(event) {
    this.focused = false;
    this.focusedOptionIndex.set(-1);
    this.startRangeIndex.set(-1);
    this.searchValue = "";
    this.onBlur.emit(event);
  }
  onHeaderCheckboxFocus(event) {
    this.headerCheckboxFocus = true;
  }
  onHeaderCheckboxBlur() {
    this.headerCheckboxFocus = false;
  }
  onHeaderCheckboxKeyDown(event) {
    if (this.$disabled()) {
      event.preventDefault();
      return;
    }
    switch (event.code) {
      case "Space":
        this.onToggleAll(event);
        break;
      case "Enter":
        this.onToggleAll(event);
        break;
      case "Tab":
        this.onHeaderCheckboxTabKeyDown(event);
        break;
      default:
        break;
    }
  }
  onHeaderCheckboxTabKeyDown(event) {
    bt(this.listViewChild?.nativeElement);
    event.preventDefault();
  }
  onFilterChange(event) {
    let value = event.target.value?.trim();
    this._filterValue.set(value);
    this.focusedOptionIndex.set(-1);
    this.startRangeIndex.set(-1);
    this.onFilter.emit({
      originalEvent: event,
      filter: this._filterValue()
    });
    !this.virtualScrollerDisabled && this.scroller.scrollToIndex(0);
  }
  onFilterBlur(event) {
    this.focusedOptionIndex.set(-1);
    this.startRangeIndex.set(-1);
  }
  onListKeyDown(event) {
    const metaKey = event.metaKey || event.ctrlKey;
    switch (event.code) {
      case "ArrowDown":
        this.onArrowDownKey(event);
        break;
      case "ArrowUp":
        this.onArrowUpKey(event);
        break;
      case "Home":
        this.onHomeKey(event);
        break;
      case "End":
        this.onEndKey(event);
        break;
      case "PageDown":
        this.onPageDownKey(event);
        break;
      case "PageUp":
        this.onPageUpKey(event);
        break;
      case "Enter":
      case "Space":
      case "NumpadEnter":
        this.onSpaceKey(event);
        break;
      case "Tab":
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.onShiftKey();
        break;
      default:
        if (this.multiple && event.code === "KeyA" && metaKey) {
          const value = this.visibleOptions().filter((option) => this.isValidOption(option)).map((option) => this.getOptionValue(option));
          this.updateModel(value, event);
          event.preventDefault();
          break;
        }
        if (!metaKey && j(event.key)) {
          this.searchOptions(event, event.key);
          event.preventDefault();
        }
        break;
    }
  }
  onFilterKeyDown(event) {
    switch (event.code) {
      case "ArrowDown":
        this.onArrowDownKey(event);
        break;
      case "ArrowUp":
        this.onArrowUpKey(event);
        break;
      case "ArrowLeft":
      case "ArrowRight":
        this.onArrowLeftKey(event, true);
        break;
      case "Home":
        this.onHomeKey(event, true);
        break;
      case "End":
        this.onEndKey(event, true);
        break;
      case "Enter":
        this.onEnterKey(event);
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.onShiftKey();
        break;
      default:
        break;
    }
  }
  onArrowDownKey(event) {
    const optionIndex = this.focusedOptionIndex() !== -1 ? this.findNextOptionIndex(this.focusedOptionIndex()) : this.findFirstFocusedOptionIndex();
    if (this.multiple && event.shiftKey) {
      this.onOptionSelectRange(event, this.startRangeIndex(), optionIndex);
    }
    this.changeFocusedOptionIndex(event, optionIndex);
    event.preventDefault();
  }
  onArrowUpKey(event) {
    const optionIndex = this.focusedOptionIndex() !== -1 ? this.findPrevOptionIndex(this.focusedOptionIndex()) : this.findLastFocusedOptionIndex();
    if (this.multiple && event.shiftKey) {
      this.onOptionSelectRange(event, optionIndex, this.startRangeIndex());
    }
    this.changeFocusedOptionIndex(event, optionIndex);
    event.preventDefault();
  }
  onArrowLeftKey(event, pressedInInputText = false) {
    pressedInInputText && this.focusedOptionIndex.set(-1);
  }
  onHomeKey(event, pressedInInputText = false) {
    if (pressedInInputText) {
      event.currentTarget.setSelectionRange(0, 0);
      this.focusedOptionIndex.set(-1);
    } else {
      let metaKey = event.metaKey || event.ctrlKey;
      let optionIndex = this.findFirstOptionIndex();
      if (this.multiple && event.shiftKey && metaKey) {
        this.onOptionSelectRange(event, optionIndex, this.startRangeIndex());
      }
      this.changeFocusedOptionIndex(event, optionIndex);
    }
    event.preventDefault();
  }
  onEndKey(event, pressedInInputText = false) {
    if (pressedInInputText) {
      const target = event.currentTarget;
      const len = target.value.length;
      target.setSelectionRange(len, len);
      this.focusedOptionIndex.set(-1);
    } else {
      let metaKey = event.metaKey || event.ctrlKey;
      let optionIndex = this.findLastOptionIndex();
      if (this.multiple && event.shiftKey && metaKey) {
        this.onOptionSelectRange(event, this.startRangeIndex(), optionIndex);
      }
      this.changeFocusedOptionIndex(event, optionIndex);
    }
    event.preventDefault();
  }
  onPageDownKey(event) {
    this.scrollInView(0);
    event.preventDefault();
  }
  onPageUpKey(event) {
    this.scrollInView(this.visibleOptions().length - 1);
    event.preventDefault();
  }
  onEnterKey(event) {
    if (this.focusedOptionIndex() !== -1) {
      if (this.multiple && event.shiftKey) this.onOptionSelectRange(event, this.focusedOptionIndex());
      else this.onOptionSelect(event, this.visibleOptions()[this.focusedOptionIndex()]);
    }
    event.preventDefault();
  }
  onSpaceKey(event) {
    this.onEnterKey(event);
  }
  onShiftKey() {
    const focusedOptionIndex = this.focusedOptionIndex();
    this.startRangeIndex.set(focusedOptionIndex);
  }
  getOptionGroupChildren(optionGroup) {
    return this.optionGroupChildren ? c(optionGroup, this.optionGroupChildren) : optionGroup.items;
  }
  getOptionGroupLabel(optionGroup) {
    return this.optionGroupLabel ? c(optionGroup, this.optionGroupLabel) : optionGroup && optionGroup.label !== void 0 ? optionGroup.label : optionGroup;
  }
  getOptionLabel(option) {
    return this.optionLabel ? c(option, this.optionLabel) : option.label != void 0 ? option.label : option;
  }
  getOptionIndex(index, scrollerOptions) {
    return this.virtualScrollerDisabled ? index : scrollerOptions && scrollerOptions.getItemOptions(index)["index"];
  }
  getOptionValue(option) {
    return this.optionValue ? c(option, this.optionValue) : !this.optionLabel && option && option.value !== void 0 ? option.value : option;
  }
  getAriaPosInset(index) {
    return (this.optionGroupLabel ? index - this.visibleOptions().slice(0, index).filter((option) => this.isOptionGroup(option)).length : index) + 1;
  }
  hasSelectedOption() {
    return s(this.modelValue());
  }
  isOptionGroup(option) {
    return this.optionGroupLabel && option.optionGroup && option.group;
  }
  changeFocusedOptionIndex(event, index) {
    if (this.focusedOptionIndex() !== index) {
      this.focusedOptionIndex.set(index);
      this.scrollInView();
      if (this.selectOnFocus && !this.multiple) {
        this.onOptionSelect(event, this.visibleOptions()[index]);
      }
    }
  }
  searchOptions(event, char) {
    this.searchValue = (this.searchValue || "") + char;
    let optionIndex = -1;
    let matched = false;
    if (this.focusedOptionIndex() !== -1) {
      optionIndex = this.visibleOptions().slice(this.focusedOptionIndex()).findIndex((option) => this.isOptionMatched(option));
      optionIndex = optionIndex === -1 ? this.visibleOptions().slice(0, this.focusedOptionIndex()).findIndex((option) => this.isOptionMatched(option)) : optionIndex + this.focusedOptionIndex();
    } else {
      optionIndex = this.visibleOptions().findIndex((option) => this.isOptionMatched(option));
    }
    if (optionIndex !== -1) {
      matched = true;
    }
    if (optionIndex === -1 && this.focusedOptionIndex() === -1) {
      optionIndex = this.findFirstFocusedOptionIndex();
    }
    if (optionIndex !== -1) {
      this.changeFocusedOptionIndex(event, optionIndex);
    }
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.searchValue = "";
      this.searchTimeout = null;
    }, 500);
    return matched;
  }
  isOptionMatched(option) {
    return this.isValidOption(option) && this.getOptionLabel(option).toLocaleLowerCase(this.filterLocale).startsWith(this.searchValue.toLocaleLowerCase(this.filterLocale));
  }
  scrollInView(index = -1) {
    const id = index !== -1 ? `${this.id}_${index}` : this.focusedOptionId;
    const element = z(this.listViewChild?.nativeElement, `li[id="${id}"]`);
    if (element) {
      element.scrollIntoView && element.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
    } else if (!this.virtualScrollerDisabled) {
      this.virtualScroll && this.scroller.scrollToIndex(index !== -1 ? index : this.focusedOptionIndex());
    }
  }
  findFirstOptionIndex() {
    return this.visibleOptions().findIndex((option) => this.isValidOption(option));
  }
  findLastOptionIndex() {
    return M(this.visibleOptions(), (option) => this.isValidOption(option));
  }
  findFirstFocusedOptionIndex() {
    const selectedIndex = this.findFirstSelectedOptionIndex();
    return selectedIndex < 0 ? this.findFirstOptionIndex() : selectedIndex;
  }
  findLastFocusedOptionIndex() {
    const selectedIndex = this.findLastSelectedOptionIndex();
    return selectedIndex < 0 ? this.findLastOptionIndex() : selectedIndex;
  }
  findLastSelectedOptionIndex() {
    return this.hasSelectedOption() ? M(this.visibleOptions(), (option) => this.isValidSelectedOption(option)) : -1;
  }
  findNextOptionIndex(index) {
    const matchedOptionIndex = index < this.visibleOptions().length - 1 ? this.visibleOptions().slice(index + 1).findIndex((option) => this.isValidOption(option)) : -1;
    return matchedOptionIndex > -1 ? matchedOptionIndex + index + 1 : index;
  }
  findNextSelectedOptionIndex(index) {
    const matchedOptionIndex = this.hasSelectedOption() && index < this.visibleOptions().length - 1 ? this.visibleOptions().slice(index + 1).findIndex((option) => this.isValidSelectedOption(option)) : -1;
    return matchedOptionIndex > -1 ? matchedOptionIndex + index + 1 : -1;
  }
  findPrevSelectedOptionIndex(index) {
    const matchedOptionIndex = this.hasSelectedOption() && index > 0 ? M(this.visibleOptions().slice(0, index), (option) => this.isValidSelectedOption(option)) : -1;
    return matchedOptionIndex > -1 ? matchedOptionIndex : -1;
  }
  findFirstSelectedOptionIndex() {
    return this.hasSelectedOption() ? this.visibleOptions().findIndex((option) => this.isValidSelectedOption(option)) : -1;
  }
  findPrevOptionIndex(index) {
    const matchedOptionIndex = index > 0 ? M(this.visibleOptions().slice(0, index), (option) => this.isValidOption(option)) : -1;
    return matchedOptionIndex > -1 ? matchedOptionIndex : index;
  }
  findSelectedOptionIndex() {
    if (this.$filled) {
      if (this.multiple) {
        for (let index = this.modelValue().length - 1; index >= 0; index--) {
          const value = this.modelValue()[index];
          const matchedOptionIndex = this.visibleOptions().findIndex((option) => this.isValidSelectedOption(option) && this.isEquals(value, this.getOptionValue(option)));
          if (matchedOptionIndex > -1) return matchedOptionIndex;
        }
      } else {
        return this.visibleOptions().findIndex((option) => this.isValidSelectedOption(option));
      }
    }
    return -1;
  }
  findNearestSelectedOptionIndex(index, firstCheckUp = false) {
    let matchedOptionIndex = -1;
    if (this.hasSelectedOption()) {
      if (firstCheckUp) {
        matchedOptionIndex = this.findPrevSelectedOptionIndex(index);
        matchedOptionIndex = matchedOptionIndex === -1 ? this.findNextSelectedOptionIndex(index) : matchedOptionIndex;
      } else {
        matchedOptionIndex = this.findNextSelectedOptionIndex(index);
        matchedOptionIndex = matchedOptionIndex === -1 ? this.findPrevSelectedOptionIndex(index) : matchedOptionIndex;
      }
    }
    return matchedOptionIndex > -1 ? matchedOptionIndex : index;
  }
  equalityKey() {
    return this.optionValue ? null : this.dataKey;
  }
  isValidSelectedOption(option) {
    return this.isValidOption(option) && this.isSelected(option);
  }
  isOptionDisabled(option) {
    if (l(this.optionDisabled)) {
      return this.optionDisabled(option);
    }
    return this.optionDisabled ? c(option, this.optionDisabled) : false;
  }
  isEquals(value1, value2) {
    return k(value1, value2, this.equalityKey());
  }
  isSelected(option) {
    const optionValue = this.getOptionValue(option);
    if (this.multiple) return (this.modelValue() || []).some((value) => this.isEquals(value, optionValue));
    else return this.isEquals(this.modelValue(), optionValue);
  }
  isValidOption(option) {
    return option && !(this.isOptionDisabled(option) || this.isOptionGroup(option));
  }
  isEmpty() {
    return !this._options()?.length || !this.visibleOptions()?.length;
  }
  hasFilter() {
    return this._filterValue() && this._filterValue().trim().length > 0;
  }
  resetFilter() {
    if (this.filterViewChild && this.filterViewChild.nativeElement) {
      this.filterViewChild.nativeElement.value = "";
    }
    this._filterValue.set(null);
  }
  drop(event) {
    if (event) {
      this.onDrop.emit(event);
    }
  }
  /**
   * @override
   *
   * @see {@link BaseEditableHolder.writeControlValue}
   * Writes the value to the control.
   */
  writeControlValue(value, setModelValue) {
    this.value = value;
    setModelValue(this.value);
    this.cd.markForCheck();
  }
  ngOnDestroy() {
    if (this.translationSubscription) {
      this.translationSubscription.unsubscribe();
    }
    super.ngOnDestroy();
  }
  static ɵfac = function Listbox_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Listbox)(ɵɵdirectiveInject(FilterService));
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _Listbox,
    selectors: [["p-listbox"], ["p-listBox"], ["p-list-box"]],
    contentQueries: function Listbox_ContentQueries(rf, ctx, dirIndex) {
      if (rf & 1) {
        ɵɵcontentQuery(dirIndex, Header, 5);
        ɵɵcontentQuery(dirIndex, Footer, 5);
        ɵɵcontentQuery(dirIndex, _c0, 4);
        ɵɵcontentQuery(dirIndex, _c1, 4);
        ɵɵcontentQuery(dirIndex, _c2, 4);
        ɵɵcontentQuery(dirIndex, _c3, 4);
        ɵɵcontentQuery(dirIndex, _c4, 4);
        ɵɵcontentQuery(dirIndex, _c5, 4);
        ɵɵcontentQuery(dirIndex, _c6, 4);
        ɵɵcontentQuery(dirIndex, _c7, 4);
        ɵɵcontentQuery(dirIndex, _c8, 4);
        ɵɵcontentQuery(dirIndex, _c9, 4);
        ɵɵcontentQuery(dirIndex, _c10, 4);
        ɵɵcontentQuery(dirIndex, PrimeTemplate, 4);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.headerFacet = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.footerFacet = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.itemTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.groupTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.headerTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.filterTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.footerTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.emptyFilterTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.emptyTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.filterIconTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.checkIconTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.checkmarkTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.loaderTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.templates = _t);
      }
    },
    viewQuery: function Listbox_Query(rf, ctx) {
      if (rf & 1) {
        ɵɵviewQuery(_c11, 5);
        ɵɵviewQuery(_c3, 5);
        ɵɵviewQuery(_c12, 5);
        ɵɵviewQuery(_c13, 5);
        ɵɵviewQuery(_c14, 5);
        ɵɵviewQuery(_c15, 5);
        ɵɵviewQuery(_c16, 5);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.headerCheckboxViewChild = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.filterViewChild = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.lastHiddenFocusableElement = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.firstHiddenFocusableElement = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.scroller = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.listViewChild = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.containerViewChild = _t.first);
      }
    },
    hostVars: 3,
    hostBindings: function Listbox_HostBindings(rf, ctx) {
      if (rf & 1) {
        ɵɵlistener("focusout", function Listbox_focusout_HostBindingHandler($event) {
          return ctx.onHostFocusOut($event);
        });
      }
      if (rf & 2) {
        ɵɵattribute("id", ctx.id);
        ɵɵclassMap(ctx.cn(ctx.cx("root"), ctx.styleClass));
      }
    },
    inputs: {
      id: "id",
      searchMessage: "searchMessage",
      emptySelectionMessage: "emptySelectionMessage",
      selectionMessage: "selectionMessage",
      autoOptionFocus: [2, "autoOptionFocus", "autoOptionFocus", booleanAttribute],
      ariaLabel: "ariaLabel",
      selectOnFocus: [2, "selectOnFocus", "selectOnFocus", booleanAttribute],
      searchLocale: [2, "searchLocale", "searchLocale", booleanAttribute],
      focusOnHover: [2, "focusOnHover", "focusOnHover", booleanAttribute],
      filterMessage: "filterMessage",
      filterFields: "filterFields",
      lazy: [2, "lazy", "lazy", booleanAttribute],
      virtualScroll: [2, "virtualScroll", "virtualScroll", booleanAttribute],
      virtualScrollItemSize: [2, "virtualScrollItemSize", "virtualScrollItemSize", numberAttribute],
      virtualScrollOptions: "virtualScrollOptions",
      scrollHeight: "scrollHeight",
      tabindex: [2, "tabindex", "tabindex", numberAttribute],
      multiple: [2, "multiple", "multiple", booleanAttribute],
      styleClass: "styleClass",
      listStyle: "listStyle",
      listStyleClass: "listStyleClass",
      readonly: [2, "readonly", "readonly", booleanAttribute],
      checkbox: [2, "checkbox", "checkbox", booleanAttribute],
      filter: [2, "filter", "filter", booleanAttribute],
      filterBy: "filterBy",
      filterMatchMode: "filterMatchMode",
      filterLocale: "filterLocale",
      metaKeySelection: [2, "metaKeySelection", "metaKeySelection", booleanAttribute],
      dataKey: "dataKey",
      showToggleAll: [2, "showToggleAll", "showToggleAll", booleanAttribute],
      optionLabel: "optionLabel",
      optionValue: "optionValue",
      optionGroupChildren: "optionGroupChildren",
      optionGroupLabel: "optionGroupLabel",
      optionDisabled: "optionDisabled",
      ariaFilterLabel: "ariaFilterLabel",
      filterPlaceHolder: "filterPlaceHolder",
      emptyFilterMessage: "emptyFilterMessage",
      emptyMessage: "emptyMessage",
      group: [2, "group", "group", booleanAttribute],
      options: "options",
      filterValue: "filterValue",
      selectAll: "selectAll",
      striped: [2, "striped", "striped", booleanAttribute],
      highlightOnSelect: [2, "highlightOnSelect", "highlightOnSelect", booleanAttribute],
      checkmark: [2, "checkmark", "checkmark", booleanAttribute],
      dragdrop: [2, "dragdrop", "dragdrop", booleanAttribute],
      fluid: [1, "fluid"]
    },
    outputs: {
      onChange: "onChange",
      onClick: "onClick",
      onDblClick: "onDblClick",
      onFilter: "onFilter",
      onFocus: "onFocus",
      onBlur: "onBlur",
      onSelectAllChange: "onSelectAllChange",
      onLazyLoad: "onLazyLoad",
      onDrop: "onDrop"
    },
    features: [ɵɵProvidersFeature([LISTBOX_VALUE_ACCESSOR, ListBoxStyle, {
      provide: CDK_DRAG_CONFIG,
      useValue: {
        zIndex: 1200
      }
    }]), ɵɵInheritDefinitionFeature],
    ngContentSelectors: _c18,
    decls: 15,
    vars: 15,
    consts: [["firstHiddenFocusableElement", ""], ["container", ""], ["lastHiddenFocusableElement", ""], ["builtInFilterElement", ""], ["headerchkbox", ""], ["icon", ""], ["filterInput", ""], ["emptyFilter", ""], ["empty", ""], ["buildInItems", ""], ["scroller", ""], ["content", ""], ["loader", ""], ["list", ""], ["role", "presentation", 1, "p-hidden-accessible", "p-hidden-focusable", 3, "focus", "tabindex"], [3, "class", 4, "ngIf"], [3, "ngStyle"], ["cdkDropList", "", 3, "class", "cdkDropListData"], [4, "ngIf"], ["role", "status", "aria-live", "polite", "class", "p-hidden-accessible", 4, "ngIf"], ["role", "status", "aria-live", "polite", 1, "p-hidden-accessible"], [4, "ngTemplateOutlet", "ngTemplateOutletContext"], ["class", "p-checkbox p-component", 3, "ngClass", "click", "keydown", 4, "ngIf"], [4, "ngIf", "ngIfElse"], [1, "p-checkbox", "p-component", 3, "click", "keydown", "ngClass"], [1, "p-hidden-accessible"], ["type", "checkbox", "readonly", "readonly", 3, "focus", "blur"], [3, "class", "ngModel", "disabled", "tabindex", "variant", "binary", 4, "ngIf"], [3, "ngModel", "disabled", "tabindex", "variant", "binary"], ["role", "status", 1, "p-hidden-accessible"], ["pInputText", "", "type", "text", "role", "searchbox", 3, "input", "keydown", "blur", "value"], ["data-p-icon", "search", 4, "ngIf"], ["data-p-icon", "search"], [4, "ngTemplateOutlet"], ["cdkDropList", "", 3, "cdkDropListDropped", "cdkDropListData"], [3, "items", "style", "itemSize", "autoSize", "lazy", "options", "tabindex", "onLazyLoad", 4, "ngIf"], [3, "onLazyLoad", "items", "itemSize", "autoSize", "lazy", "options", "tabindex"], ["role", "listbox", "cdkDropList", "", 3, "focus", "blur", "keydown", "cdkDropListDropped", "tabindex", "ngClass", "cdkDropListData"], ["ngFor", "", 3, "ngForOf"], ["role", "option", "cdkDrag", "", 3, "ngStyle", "cdkDragData", "cdkDragDisabled"], ["pRipple", "", "role", "option", "cdkDrag", "", 3, "click", "dblclick", "mousedown", "mouseenter", "touchend", "ngStyle", "cdkDragData", "cdkDragDisabled"], [3, "class", "ngModel", "readonly", "disabled", "tabindex", "variant", "binary", 4, "ngIf"], [3, "ngModel", "readonly", "disabled", "tabindex", "variant", "binary"], ["data-p-icon", "blank", 3, "class", 4, "ngIf"], ["data-p-icon", "check", 3, "class", 4, "ngIf"], ["data-p-icon", "blank"], ["data-p-icon", "check"]],
    template: function Listbox_Template(rf, ctx) {
      if (rf & 1) {
        const _r1 = ɵɵgetCurrentView();
        ɵɵprojectionDef(_c17);
        ɵɵelementStart(0, "span", 14, 0);
        ɵɵlistener("focus", function Listbox_Template_span_focus_0_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.onFirstHiddenFocus($event));
        });
        ɵɵelementEnd();
        ɵɵtemplate(2, Listbox_div_2_Template, 3, 7, "div", 15)(3, Listbox_div_3_Template, 5, 5, "div", 15);
        ɵɵelementStart(4, "div", 16, 1);
        ɵɵconditionalCreate(6, Listbox_Conditional_6_Template, 3, 5, "div", 17)(7, Listbox_Conditional_7_Template, 3, 5, "div", 17)(8, Listbox_Conditional_8_Template, 4, 2);
        ɵɵelementEnd();
        ɵɵtemplate(9, Listbox_div_9_Template, 3, 5, "div", 18)(10, Listbox_span_10_Template, 2, 1, "span", 19);
        ɵɵelementStart(11, "span", 20);
        ɵɵtext(12);
        ɵɵelementEnd();
        ɵɵelementStart(13, "span", 14, 2);
        ɵɵlistener("focus", function Listbox_Template_span_focus_13_listener($event) {
          ɵɵrestoreView(_r1);
          return ɵɵresetView(ctx.onLastHiddenFocus($event));
        });
        ɵɵelementEnd();
      }
      if (rf & 2) {
        ɵɵproperty("tabindex", !ctx.$disabled() ? ctx.tabindex : -1);
        ɵɵattribute("data-p-hidden-focusable", true);
        ɵɵadvance(2);
        ɵɵproperty("ngIf", ctx.headerFacet || ctx.headerTemplate || ctx._headerTemplate);
        ɵɵadvance();
        ɵɵproperty("ngIf", ctx.checkbox && ctx.multiple && ctx.showToggleAll || ctx.filter);
        ɵɵadvance();
        ɵɵclassMap(ctx.cn(ctx.cx("listContainer"), ctx.listStyleClass));
        ɵɵstyleProp("max-height", ctx.virtualScroll ? "auto" : ctx.scrollHeight || "auto");
        ɵɵproperty("ngStyle", ctx.listStyle);
        ɵɵadvance(2);
        ɵɵconditional(ctx.hasFilter() && ctx.isEmpty() ? 6 : !ctx.hasFilter() && ctx.isEmpty() ? 7 : 8);
        ɵɵadvance(3);
        ɵɵproperty("ngIf", ctx.footerFacet || ctx.footerTemplate || ctx._footerTemplate);
        ɵɵadvance();
        ɵɵproperty("ngIf", ctx.isEmpty());
        ɵɵadvance(2);
        ɵɵtextInterpolate1(" ", ctx.selectedMessageText, " ");
        ɵɵadvance();
        ɵɵproperty("tabindex", !ctx.$disabled() ? ctx.tabindex : -1);
        ɵɵattribute("data-p-hidden-focusable", true);
      }
    },
    dependencies: [CommonModule, NgClass, NgForOf, NgIf, NgTemplateOutlet, NgStyle, Ripple, Scroller, InputIcon, SearchIcon, Checkbox, CheckIcon, IconField, InputText, BlankIcon, FormsModule, NgControlStatus, NgModel, SharedModule, DragDropModule, CdkDropList, CdkDrag],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Listbox, [{
    type: Component,
    args: [{
      selector: "p-listbox, p-listBox, p-list-box",
      standalone: true,
      imports: [CommonModule, Ripple, Scroller, InputIcon, SearchIcon, Checkbox, CheckIcon, IconField, InputText, BlankIcon, FormsModule, SharedModule, DragDropModule],
      template: `
        <span #firstHiddenFocusableElement role="presentation" class="p-hidden-accessible p-hidden-focusable" [tabindex]="!$disabled() ? tabindex : -1" (focus)="onFirstHiddenFocus($event)" [attr.data-p-hidden-focusable]="true"> </span>
        <div [class]="cx('header')" *ngIf="headerFacet || headerTemplate || _headerTemplate">
            <ng-content select="p-header"></ng-content>
            <ng-container *ngTemplateOutlet="headerTemplate || _headerTemplate; context: { $implicit: modelValue(), options: visibleOptions() }"></ng-container>
        </div>
        <div [class]="cx('header')" *ngIf="(checkbox && multiple && showToggleAll) || filter">
            <div *ngIf="checkbox && multiple && showToggleAll" class="p-checkbox p-component" [ngClass]="{ 'p-checkbox-disabled': $disabled() }" (click)="onToggleAll($event)" (keydown)="onHeaderCheckboxKeyDown($event)">
                <div class="p-hidden-accessible" [attr.data-p-hidden-accessible]="true">
                    <input
                        #headerchkbox
                        type="checkbox"
                        readonly="readonly"
                        [attr.checked]="allSelected()"
                        [attr.disabled]="$disabled() ? '' : undefined"
                        (focus)="onHeaderCheckboxFocus($event)"
                        (blur)="onHeaderCheckboxBlur()"
                        [attr.aria-label]="toggleAllAriaLabel"
                    />
                </div>
                <p-checkbox
                    *ngIf="checkbox && multiple"
                    [class]="cx('optionCheckIcon')"
                    [ngModel]="allSelected()"
                    [disabled]="$disabled()"
                    [tabindex]="-1"
                    [variant]="config.inputStyle() === 'filled' || config.inputVariant() === 'filled' ? 'filled' : 'outlined'"
                    [binary]="true"
                >
                    <ng-container *ngIf="checkIconTemplate || _checkIconTemplate">
                        <ng-template #icon>
                            <ng-template *ngTemplateOutlet="checkIconTemplate || _checkIconTemplate; context: { $implicit: allSelected() }"></ng-template>
                        </ng-template>
                    </ng-container>
                </p-checkbox>
            </div>
            <ng-container *ngIf="filterTemplate || _filterTemplate; else builtInFilterElement">
                <ng-container *ngTemplateOutlet="filterTemplate || _filterTemplate; context: { options: filterOptions }"></ng-container>
            </ng-container>
            <ng-template #builtInFilterElement>
                <div *ngIf="filter">
                    <p-iconfield>
                        <input
                            #filterInput
                            pInputText
                            type="text"
                            [class]="cx('pcFilter')"
                            role="searchbox"
                            [value]="_filterValue() || ''"
                            [attr.disabled]="$disabled() ? '' : undefined"
                            [attr.aria-owns]="id + '_list'"
                            [attr.aria-activedescendant]="focusedOptionId"
                            [attr.placeholder]="filterPlaceHolder"
                            [attr.aria-label]="ariaFilterLabel"
                            [attr.tabindex]="!$disabled() && !focused ? tabindex : -1"
                            (input)="onFilterChange($event)"
                            (keydown)="onFilterKeyDown($event)"
                            (blur)="onFilterBlur($event)"
                        />
                        <p-inputicon>
                            <svg data-p-icon="search" *ngIf="!filterIconTemplate && !_filterIconTemplate" [attr.aria-hidden]="true" />
                            <span *ngIf="filterIconTemplate || _filterIconTemplate" [attr.aria-hidden]="true">
                                <ng-template *ngTemplateOutlet="filterIconTemplate || _filterIconTemplate"></ng-template>
                            </span>
                        </p-inputicon>
                    </p-iconfield>
                </div>
                <span role="status" [attr.aria-live]="'polite'" class="p-hidden-accessible" [attr.data-p-hidden-accessible]="true">
                    {{ filterResultMessageText }}
                </span>
            </ng-template>
        </div>
        <div #container [class]="cn(cx('listContainer'), listStyleClass)" [ngStyle]="listStyle" [style.max-height]="virtualScroll ? 'auto' : scrollHeight || 'auto'">
            @if (hasFilter() && isEmpty()) {
                <div [class]="cx('emptyMessage')" [cdkDropListData]="$any([])" (cdkDropListDropped)="drop($event)" cdkDropList>
                    @if (!emptyFilterTemplate && !_emptyFilterTemplate && !_emptyTemplate && !emptyTemplate) {
                        {{ emptyFilterMessageText }}
                    } @else {
                        <ng-container #emptyFilter *ngTemplateOutlet="emptyFilterTemplate || _emptyFilterTemplate || _emptyTemplate || emptyTemplate"></ng-container>
                    }
                </div>
            } @else if (!hasFilter() && isEmpty()) {
                <div [class]="cx('emptyMessage')" [cdkDropListData]="$any([])" (cdkDropListDropped)="drop($event)" cdkDropList>
                    @if (!emptyTemplate && !_emptyTemplate) {
                        {{ emptyMessage }}
                    } @else {
                        <ng-container #empty *ngTemplateOutlet="emptyTemplate || _emptyTemplate"></ng-container>
                    }
                </div>
            } @else {
                <p-scroller
                    #scroller
                    *ngIf="virtualScroll"
                    [items]="visibleOptions()"
                    [style]="{ height: scrollHeight }"
                    [itemSize]="virtualScrollItemSize"
                    [autoSize]="true"
                    [lazy]="lazy"
                    [options]="virtualScrollOptions"
                    (onLazyLoad)="onLazyLoad.emit($event)"
                    [tabindex]="scrollerTabIndex"
                >
                    <ng-template #content let-items let-scrollerOptions="options">
                        <ng-container *ngTemplateOutlet="buildInItems; context: { $implicit: items, options: scrollerOptions }"></ng-container>
                    </ng-template>
                    @if (loaderTemplate || _loaderTemplate) {
                        <ng-template #loader let-scrollerOptions="options">
                            <ng-container *ngTemplateOutlet="loaderTemplate || _loaderTemplate; context: { options: scrollerOptions }"></ng-container>
                        </ng-template>
                    }
                </p-scroller>
                <ng-container *ngIf="!virtualScroll">
                    <ng-container *ngTemplateOutlet="buildInItems; context: { $implicit: visibleOptions(), options: {} }"></ng-container>
                </ng-container>

                <ng-template #buildInItems let-items let-scrollerOptions="options">
                    <ul
                        #list
                        [class]="cx('list')"
                        role="listbox"
                        [tabindex]="-1"
                        [attr.aria-multiselectable]="true"
                        [ngClass]="scrollerOptions.contentStyleClass"
                        [style]="scrollerOptions.contentStyle"
                        [attr.aria-activedescendant]="focused ? focusedOptionId : undefined"
                        [attr.aria-label]="ariaLabel"
                        [attr.aria-disabled]="$disabled()"
                        (focus)="onListFocus($event)"
                        (blur)="onListBlur($event)"
                        (keydown)="onListKeyDown($event)"
                        cdkDropList
                        [cdkDropListData]="items"
                        (cdkDropListDropped)="drop($event)"
                    >
                        <ng-template ngFor let-option [ngForOf]="items" let-i="index">
                            <ng-container *ngIf="isOptionGroup(option)">
                                <li
                                    [attr.id]="id + '_' + getOptionIndex(i, scrollerOptions)"
                                    [class]="cx('optionGroup')"
                                    [ngStyle]="{ height: scrollerOptions.itemSize + 'px' }"
                                    role="option"
                                    cdkDrag
                                    [cdkDragData]="option"
                                    [cdkDragDisabled]="!dragdrop"
                                >
                                    <span *ngIf="!groupTemplate && !_groupTemplate">{{ getOptionGroupLabel(option.optionGroup) }}</span>
                                    <ng-container *ngTemplateOutlet="groupTemplate || _groupTemplate; context: { $implicit: option.optionGroup }"></ng-container>
                                </li>
                            </ng-container>
                            <ng-container *ngIf="!isOptionGroup(option)">
                                <li
                                    pRipple
                                    [class]="cx('option', { option, i, scrollerOptions })"
                                    role="option"
                                    [attr.id]="id + '_' + getOptionIndex(i, scrollerOptions)"
                                    [ngStyle]="{ height: scrollerOptions.itemSize + 'px' }"
                                    [attr.aria-label]="getOptionLabel(option)"
                                    [attr.aria-selected]="isSelected(option)"
                                    [attr.aria-disabled]="isOptionDisabled(option)"
                                    [attr.aria-setsize]="ariaSetSize"
                                    [attr.ariaPosInset]="getAriaPosInset(getOptionIndex(i, scrollerOptions))"
                                    [attr.data-pc-section]="'item'"
                                    [attr.data-p-selected]="isSelected(option)"
                                    (click)="onOptionSelect($event, option, getOptionIndex(i, scrollerOptions))"
                                    (dblclick)="onOptionDoubleClick($event, option)"
                                    (mousedown)="onOptionMouseDown($event, getOptionIndex(i, scrollerOptions))"
                                    (mouseenter)="onOptionMouseEnter($event, getOptionIndex(i, scrollerOptions))"
                                    (touchend)="onOptionTouchEnd()"
                                    cdkDrag
                                    [cdkDragData]="option"
                                    [cdkDragDisabled]="!dragdrop"
                                >
                                    <p-checkbox
                                        *ngIf="checkbox && multiple"
                                        [class]="cx('optionCheckIcon')"
                                        [ngModel]="isSelected(option)"
                                        [readonly]="true"
                                        [disabled]="$disabled() || isOptionDisabled(option)"
                                        [tabindex]="-1"
                                        [variant]="config.inputStyle() === 'filled' || config.inputVariant() === 'filled' ? 'filled' : 'outlined'"
                                        [binary]="true"
                                    >
                                        <ng-container *ngIf="checkIconTemplate || _checkIconTemplate">
                                            <ng-template #icon>
                                                <ng-template *ngTemplateOutlet="checkIconTemplate || _checkIconTemplate; context: { $implicit: isSelected(option) }"></ng-template>
                                            </ng-template>
                                        </ng-container>
                                    </p-checkbox>
                                    <ng-container *ngIf="checkmark">
                                        <ng-container *ngIf="!checkmarkTemplate && !_checkmarkTemplate">
                                            <svg data-p-icon="blank" *ngIf="!isSelected(option)" [class]="cx('optionBlankIcon')" />
                                            <svg data-p-icon="check" *ngIf="isSelected(option)" [class]="cx('optionCheckIcon')" />
                                        </ng-container>
                                        <ng-container *ngTemplateOutlet="checkmarkTemplate || _checkmarkTemplate; context: { implicit: isSelected(option) }"></ng-container>
                                    </ng-container>
                                    <span *ngIf="!itemTemplate && !_itemTemplate">{{ getOptionLabel(option) }}</span>
                                    <ng-container
                                        *ngTemplateOutlet="
                                            itemTemplate || _itemTemplate;
                                            context: {
                                                $implicit: option,
                                                index: getOptionIndex(i, scrollerOptions),
                                                selected: isSelected(option),
                                                disabled: isOptionDisabled(option)
                                            }
                                        "
                                    ></ng-container>
                                </li>
                            </ng-container>
                        </ng-template>
                    </ul>
                </ng-template>
            }
        </div>
        <div *ngIf="footerFacet || footerTemplate || _footerTemplate">
            <ng-content select="p-footer"></ng-content>
            <ng-container *ngTemplateOutlet="footerTemplate || _footerTemplate; context: { $implicit: modelValue(), options: visibleOptions() }"></ng-container>
        </div>
        <span *ngIf="isEmpty()" role="status" aria-live="polite" class="p-hidden-accessible">
            {{ emptyMessage }}
        </span>
        <span role="status" aria-live="polite" class="p-hidden-accessible">
            {{ selectedMessageText }}
        </span>
        <span #lastHiddenFocusableElement role="presentation" class="p-hidden-accessible p-hidden-focusable" [tabindex]="!$disabled() ? tabindex : -1" (focus)="onLastHiddenFocus($event)" [attr.data-p-hidden-focusable]="true"> </span>
    `,
      providers: [LISTBOX_VALUE_ACCESSOR, ListBoxStyle, {
        provide: CDK_DRAG_CONFIG,
        useValue: {
          zIndex: 1200
        }
      }],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      host: {
        "[attr.id]": "id",
        "[class]": "cn(cx('root'), styleClass)"
      }
    }]
  }], () => [{
    type: FilterService
  }], {
    id: [{
      type: Input
    }],
    searchMessage: [{
      type: Input
    }],
    emptySelectionMessage: [{
      type: Input
    }],
    selectionMessage: [{
      type: Input
    }],
    autoOptionFocus: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    ariaLabel: [{
      type: Input
    }],
    selectOnFocus: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    searchLocale: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    focusOnHover: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    filterMessage: [{
      type: Input
    }],
    filterFields: [{
      type: Input
    }],
    lazy: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    virtualScroll: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    virtualScrollItemSize: [{
      type: Input,
      args: [{
        transform: numberAttribute
      }]
    }],
    virtualScrollOptions: [{
      type: Input
    }],
    scrollHeight: [{
      type: Input
    }],
    tabindex: [{
      type: Input,
      args: [{
        transform: numberAttribute
      }]
    }],
    multiple: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    styleClass: [{
      type: Input
    }],
    listStyle: [{
      type: Input
    }],
    listStyleClass: [{
      type: Input
    }],
    readonly: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    checkbox: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    filter: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    filterBy: [{
      type: Input
    }],
    filterMatchMode: [{
      type: Input
    }],
    filterLocale: [{
      type: Input
    }],
    metaKeySelection: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    dataKey: [{
      type: Input
    }],
    showToggleAll: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    optionLabel: [{
      type: Input
    }],
    optionValue: [{
      type: Input
    }],
    optionGroupChildren: [{
      type: Input
    }],
    optionGroupLabel: [{
      type: Input
    }],
    optionDisabled: [{
      type: Input
    }],
    ariaFilterLabel: [{
      type: Input
    }],
    filterPlaceHolder: [{
      type: Input
    }],
    emptyFilterMessage: [{
      type: Input
    }],
    emptyMessage: [{
      type: Input
    }],
    group: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    options: [{
      type: Input
    }],
    filterValue: [{
      type: Input
    }],
    selectAll: [{
      type: Input
    }],
    striped: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    highlightOnSelect: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    checkmark: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    dragdrop: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    onChange: [{
      type: Output
    }],
    onClick: [{
      type: Output
    }],
    onDblClick: [{
      type: Output
    }],
    onFilter: [{
      type: Output
    }],
    onFocus: [{
      type: Output
    }],
    onBlur: [{
      type: Output
    }],
    onSelectAllChange: [{
      type: Output
    }],
    onLazyLoad: [{
      type: Output
    }],
    onDrop: [{
      type: Output
    }],
    headerCheckboxViewChild: [{
      type: ViewChild,
      args: ["headerchkbox"]
    }],
    filterViewChild: [{
      type: ViewChild,
      args: ["filter"]
    }],
    lastHiddenFocusableElement: [{
      type: ViewChild,
      args: ["lastHiddenFocusableElement"]
    }],
    firstHiddenFocusableElement: [{
      type: ViewChild,
      args: ["firstHiddenFocusableElement"]
    }],
    scroller: [{
      type: ViewChild,
      args: ["scroller"]
    }],
    listViewChild: [{
      type: ViewChild,
      args: ["list"]
    }],
    containerViewChild: [{
      type: ViewChild,
      args: ["container"]
    }],
    headerFacet: [{
      type: ContentChild,
      args: [Header]
    }],
    footerFacet: [{
      type: ContentChild,
      args: [Footer]
    }],
    itemTemplate: [{
      type: ContentChild,
      args: ["item", {
        descendants: false
      }]
    }],
    groupTemplate: [{
      type: ContentChild,
      args: ["group", {
        descendants: false
      }]
    }],
    headerTemplate: [{
      type: ContentChild,
      args: ["header", {
        descendants: false
      }]
    }],
    filterTemplate: [{
      type: ContentChild,
      args: ["filter", {
        descendants: false
      }]
    }],
    footerTemplate: [{
      type: ContentChild,
      args: ["footer", {
        descendants: false
      }]
    }],
    emptyFilterTemplate: [{
      type: ContentChild,
      args: ["emptyfilter", {
        descendants: false
      }]
    }],
    emptyTemplate: [{
      type: ContentChild,
      args: ["empty", {
        descendants: false
      }]
    }],
    filterIconTemplate: [{
      type: ContentChild,
      args: ["filtericon", {
        descendants: false
      }]
    }],
    checkIconTemplate: [{
      type: ContentChild,
      args: ["checkicon", {
        descendants: false
      }]
    }],
    checkmarkTemplate: [{
      type: ContentChild,
      args: ["checkmark", {
        descendants: false
      }]
    }],
    loaderTemplate: [{
      type: ContentChild,
      args: ["loader", {
        descendants: false
      }]
    }],
    templates: [{
      type: ContentChildren,
      args: [PrimeTemplate]
    }],
    onHostFocusOut: [{
      type: HostListener,
      args: ["focusout", ["$event"]]
    }]
  });
})();
var ListboxModule = class _ListboxModule {
  static ɵfac = function ListboxModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ListboxModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _ListboxModule,
    imports: [Listbox, SharedModule],
    exports: [Listbox, SharedModule]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [Listbox, SharedModule, SharedModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ListboxModule, [{
    type: NgModule,
    args: [{
      imports: [Listbox, SharedModule],
      exports: [Listbox, SharedModule]
    }]
  }], null, null);
})();

export {
  ListBoxStyle,
  ListboxClasses,
  LISTBOX_VALUE_ACCESSOR,
  Listbox,
  ListboxModule
};
//# sourceMappingURL=chunk-7BZ4QDNE.js.map
