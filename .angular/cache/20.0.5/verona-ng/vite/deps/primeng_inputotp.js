import {
  InputText
} from "./chunk-TN5ADRDY.js";
import {
  BaseEditableHolder
} from "./chunk-XUDNEHKK.js";
import "./chunk-HYYAGKH6.js";
import "./chunk-J26OPXND.js";
import "./chunk-6PBBDZZF.js";
import {
  AutoFocus
} from "./chunk-PWGHT7WG.js";
import "./chunk-LGMF4Z35.js";
import "./chunk-SDIPDP6M.js";
import {
  BaseStyle
} from "./chunk-UZ6FKPFG.js";
import {
  PrimeTemplate,
  SharedModule
} from "./chunk-6W6MVVYN.js";
import {
  NG_VALUE_ACCESSOR
} from "./chunk-F3LB25CD.js";
import "./chunk-3P3YI57Q.js";
import "./chunk-ICG2ZITK.js";
import {
  CommonModule,
  NgForOf,
  NgIf,
  NgTemplateOutlet
} from "./chunk-7ACODBRA.js";
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
  computed,
  forwardRef,
  inject,
  input,
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
  ɵɵproperty,
  ɵɵpureFunction3,
  ɵɵqueryRefresh,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate
} from "./chunk-DL5YMDBM.js";
import "./chunk-YVXMBCE5.js";
import "./chunk-G6ECYYJH.js";
import "./chunk-RTGP7ALM.js";
import "./chunk-4MWRP73S.js";

// node_modules/@primeuix/styles/dist/inputotp/index.mjs
var style = "\n    .p-inputotp {\n        display: flex;\n        align-items: center;\n        gap: dt('inputotp.gap');\n    }\n\n    .p-inputotp-input {\n        text-align: center;\n        width: dt('inputotp.input.width');\n    }\n\n    .p-inputotp-input.p-inputtext-sm {\n        text-align: center;\n        width: dt('inputotp.input.sm.width');\n    }\n\n    .p-inputotp-input.p-inputtext-lg {\n        text-align: center;\n        width: dt('inputotp.input.lg.width');\n    }\n";

// node_modules/primeng/fesm2022/primeng-inputotp.mjs
var _c0 = ["input"];
var _c1 = (a0, a1, a2) => ({
  $implicit: a0,
  events: a1,
  index: a2
});
function InputOtp_ng_container_0_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = ɵɵgetCurrentView();
    ɵɵelementContainerStart(0);
    ɵɵelementStart(1, "input", 2);
    ɵɵlistener("input", function InputOtp_ng_container_0_ng_container_1_Template_input_input_1_listener($event) {
      ɵɵrestoreView(_r1);
      const i_r2 = ɵɵnextContext().$implicit;
      const ctx_r2 = ɵɵnextContext();
      return ɵɵresetView(ctx_r2.onInput($event, i_r2 - 1));
    })("focus", function InputOtp_ng_container_0_ng_container_1_Template_input_focus_1_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r2 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r2.onInputFocus($event));
    })("blur", function InputOtp_ng_container_0_ng_container_1_Template_input_blur_1_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r2 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r2.onInputBlur($event));
    })("paste", function InputOtp_ng_container_0_ng_container_1_Template_input_paste_1_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r2 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r2.onPaste($event));
    })("keydown", function InputOtp_ng_container_0_ng_container_1_Template_input_keydown_1_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r2 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r2.onKeyDown($event));
    });
    ɵɵelementEnd();
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const i_r2 = ɵɵnextContext().$implicit;
    const ctx_r2 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵclassMap(ctx_r2.cn(ctx_r2.cx("pcInputText"), ctx_r2.styleClass));
    ɵɵproperty("value", ctx_r2.getModelValue(i_r2))("pSize", ctx_r2.size())("variant", ctx_r2.$variant())("invalid", ctx_r2.invalid())("pAutoFocus", ctx_r2.getAutofocus(i_r2));
    ɵɵattribute("maxlength", i_r2 === 1 ? ctx_r2.length : 1)("type", ctx_r2.inputType)("name", ctx_r2.name())("tabindex", ctx_r2.tabindex)("required", ctx_r2.required() ? "" : void 0)("readonly", ctx_r2.readonly ? "" : void 0)("disabled", ctx_r2.$disabled() ? "" : void 0);
  }
}
function InputOtp_ng_container_0_ng_container_2_ng_container_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainer(0);
  }
}
function InputOtp_ng_container_0_ng_container_2_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, InputOtp_ng_container_0_ng_container_2_ng_container_1_Template, 1, 0, "ng-container", 3);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const i_r2 = ɵɵnextContext().$implicit;
    const ctx_r2 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵproperty("ngTemplateOutlet", ctx_r2.inputTemplate || ctx_r2._inputTemplate)("ngTemplateOutletContext", ɵɵpureFunction3(2, _c1, ctx_r2.getToken(i_r2 - 1), ctx_r2.getTemplateEvents(i_r2 - 1), i_r2));
  }
}
function InputOtp_ng_container_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelementContainerStart(0);
    ɵɵtemplate(1, InputOtp_ng_container_0_ng_container_1_Template, 2, 14, "ng-container", 1)(2, InputOtp_ng_container_0_ng_container_2_Template, 2, 6, "ng-container", 1);
    ɵɵelementContainerEnd();
  }
  if (rf & 2) {
    const ctx_r2 = ɵɵnextContext();
    ɵɵadvance();
    ɵɵproperty("ngIf", !ctx_r2.inputTemplate && !ctx_r2._inputTemplate);
    ɵɵadvance();
    ɵɵproperty("ngIf", ctx_r2.inputTemplate || ctx_r2._inputTemplate);
  }
}
var classes = {
  root: "p-inputotp p-component",
  pcInputText: "p-inputotp-input"
};
var InputOtpStyle = class _InputOtpStyle extends BaseStyle {
  name = "inputotp";
  theme = style;
  classes = classes;
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵInputOtpStyle_BaseFactory;
    return function InputOtpStyle_Factory(__ngFactoryType__) {
      return (ɵInputOtpStyle_BaseFactory || (ɵInputOtpStyle_BaseFactory = ɵɵgetInheritedFactory(_InputOtpStyle)))(__ngFactoryType__ || _InputOtpStyle);
    };
  })();
  static ɵprov = ɵɵdefineInjectable({
    token: _InputOtpStyle,
    factory: _InputOtpStyle.ɵfac
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InputOtpStyle, [{
    type: Injectable
  }], null, null);
})();
var InputOtpClasses;
(function(InputOtpClasses2) {
  InputOtpClasses2["root"] = "p-inputotp";
  InputOtpClasses2["pcInputText"] = "p-inputotp-input";
})(InputOtpClasses || (InputOtpClasses = {}));
var INPUT_OTP_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => InputOtp),
  multi: true
};
var InputOtp = class _InputOtp extends BaseEditableHolder {
  /**
   * When present, it specifies that an input field is read-only.
   * @group Props
   */
  readonly;
  /**
   * Index of the element in tabbing order.
   * @group Props
   */
  tabindex = null;
  /**
   * Number of characters to initiate.
   * @group Props
   */
  length = 4;
  /**
   * Style class of the input element.
   * @group Props
   */
  styleClass;
  /**
   * Mask pattern.
   * @group Props
   */
  mask = false;
  /**
   * When present, it specifies that an input field is integer-only.
   * @group Props
   */
  integerOnly = false;
  /**
   * When present, it specifies that the component should automatically get focus on load.
   * @group Props
   */
  autofocus;
  /**
   * Specifies the input variant of the component.
   * @defaultValue undefined
   * @group Props
   */
  variant = input(...ngDevMode ? [void 0, {
    debugName: "variant"
  }] : []);
  /**
   * Specifies the size of the component.
   * @defaultValue undefined
   * @group Props
   */
  size = input(...ngDevMode ? [void 0, {
    debugName: "size"
  }] : []);
  /**
   * Callback to invoke on value change.
   * @group Emits
   */
  onChange = new EventEmitter();
  /**
   * Callback to invoke when the component receives focus.
   * @param {Event} event - Browser event.
   * @group Emits
   */
  onFocus = new EventEmitter();
  /**
   * Callback to invoke when the component loses focus.
   * @param {Event} event - Browser event.
   * @group Emits
   */
  onBlur = new EventEmitter();
  /**
   * Input template.
   * @param {InputOtpInputTemplateContext} context - Context of the template
   * @see {@link InputOtpInputTemplateContext}
   * @group Templates
   */
  inputTemplate;
  templates;
  _inputTemplate;
  tokens = [];
  value;
  $variant = computed(() => this.variant() || this.config.inputStyle() || this.config.inputVariant(), ...ngDevMode ? [{
    debugName: "$variant"
  }] : []);
  get inputMode() {
    return this.integerOnly ? "numeric" : "text";
  }
  get inputType() {
    return this.mask ? "password" : "text";
  }
  _componentStyle = inject(InputOtpStyle);
  ngAfterContentInit() {
    this.templates.forEach((item) => {
      switch (item.getType()) {
        case "input":
          this._inputTemplate = item.template;
          break;
        default:
          this._inputTemplate = item.template;
          break;
      }
    });
  }
  getToken(index) {
    return this.tokens[index];
  }
  getTemplateEvents(index) {
    return {
      input: (event) => this.onInput(event, index),
      keydown: (event) => this.onKeyDown(event),
      focus: (event) => this.onFocus.emit(event),
      blur: (event) => this.onBlur.emit(event),
      paste: (event) => this.onPaste(event)
    };
  }
  onInput(event, index) {
    const value = event.target.value;
    if (index === 0 && value.length > 1) {
      this.handleOnPaste(value, event);
      event.stopPropagation();
      return;
    }
    this.tokens[index] = value;
    this.updateModel(event);
    if (event.inputType === "deleteContentBackward") {
      this.moveToPrev(event);
    } else if (event.inputType === "insertText" || event.inputType === "deleteContentForward") {
      this.moveToNext(event);
    }
  }
  updateModel(event) {
    const newValue = this.tokens.join("");
    this.writeModelValue(newValue);
    this.onModelChange(newValue);
    this.onChange.emit({
      originalEvent: event,
      value: newValue
    });
  }
  updateTokens() {
    if (this.value !== null && this.value !== void 0) {
      if (Array.isArray(this.value)) {
        this.tokens = [...this.value];
      } else {
        this.tokens = this.value.toString().split("");
      }
    } else {
      this.tokens = [];
    }
  }
  getModelValue(i) {
    return this.tokens[i - 1] || "";
  }
  getAutofocus(i) {
    if (i === 1) {
      return this.autofocus;
    }
    return false;
  }
  moveToPrev(event) {
    let prevInput = this.findPrevInput(event.target);
    if (prevInput) {
      prevInput.focus();
      prevInput.select();
    }
  }
  moveToNext(event) {
    let nextInput = this.findNextInput(event.target);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  }
  findNextInput(element) {
    let nextElement = element.nextElementSibling;
    if (!nextElement) return;
    return nextElement.nodeName === "INPUT" ? nextElement : this.findNextInput(nextElement);
  }
  findPrevInput(element) {
    let prevElement = element.previousElementSibling;
    if (!prevElement) return;
    return prevElement.nodeName === "INPUT" ? prevElement : this.findPrevInput(prevElement);
  }
  onInputFocus(event) {
    event.target.select();
    this.onFocus.emit(event);
  }
  onInputBlur(event) {
    this.onBlur.emit(event);
  }
  onKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    switch (event.code) {
      case "ArrowLeft":
        this.moveToPrev(event);
        event.preventDefault();
        break;
      case "ArrowUp":
      case "ArrowDown":
        event.preventDefault();
        break;
      case "Backspace":
        if (event.target.value.length === 0) {
          this.moveToPrev(event);
          event.preventDefault();
        }
        break;
      case "ArrowRight":
        this.moveToNext(event);
        event.preventDefault();
        break;
      default:
        if (this.integerOnly && !(Number(event.key) >= 0 && Number(event.key) <= 9) || this.tokens.join("").length >= this.length && event.code !== "Delete") {
          event.preventDefault();
        }
        break;
    }
  }
  onPaste(event) {
    if (!this.$disabled() && !this.readonly) {
      let paste = event.clipboardData.getData("text");
      if (paste.length) {
        this.handleOnPaste(paste, event);
      }
      event.preventDefault();
    }
  }
  handleOnPaste(paste, event) {
    let pastedCode = paste.substring(0, this.length + 1);
    if (!this.integerOnly || !isNaN(pastedCode)) {
      this.tokens = pastedCode.split("");
      this.updateModel(event);
    }
  }
  getRange(n) {
    return Array.from({
      length: n
    }, (_, index) => index + 1);
  }
  trackByFn(index) {
    return index;
  }
  /**
   * @override
   *
   * @see {@link BaseEditableHolder.writeControlValue}
   * Writes the value to the control.
   */
  writeControlValue(value, setModelValue) {
    if (value) {
      if (Array.isArray(value) && value.length > 0) {
        this.value = value.slice(0, this.length);
      } else {
        this.value = value.toString().split("").slice(0, this.length);
      }
    } else {
      this.value = value;
    }
    setModelValue(this.value);
    this.updateTokens();
    this.cd.markForCheck();
  }
  static ɵfac = /* @__PURE__ */ (() => {
    let ɵInputOtp_BaseFactory;
    return function InputOtp_Factory(__ngFactoryType__) {
      return (ɵInputOtp_BaseFactory || (ɵInputOtp_BaseFactory = ɵɵgetInheritedFactory(_InputOtp)))(__ngFactoryType__ || _InputOtp);
    };
  })();
  static ɵcmp = ɵɵdefineComponent({
    type: _InputOtp,
    selectors: [["p-inputOtp"], ["p-inputotp"], ["p-input-otp"]],
    contentQueries: function InputOtp_ContentQueries(rf, ctx, dirIndex) {
      if (rf & 1) {
        ɵɵcontentQuery(dirIndex, _c0, 4);
        ɵɵcontentQuery(dirIndex, PrimeTemplate, 4);
      }
      if (rf & 2) {
        let _t;
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.inputTemplate = _t.first);
        ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx.templates = _t);
      }
    },
    hostVars: 2,
    hostBindings: function InputOtp_HostBindings(rf, ctx) {
      if (rf & 2) {
        ɵɵclassMap(ctx.cx("root"));
      }
    },
    inputs: {
      readonly: [2, "readonly", "readonly", booleanAttribute],
      tabindex: "tabindex",
      length: "length",
      styleClass: "styleClass",
      mask: "mask",
      integerOnly: "integerOnly",
      autofocus: [2, "autofocus", "autofocus", booleanAttribute],
      variant: [1, "variant"],
      size: [1, "size"]
    },
    outputs: {
      onChange: "onChange",
      onFocus: "onFocus",
      onBlur: "onBlur"
    },
    features: [ɵɵProvidersFeature([INPUT_OTP_VALUE_ACCESSOR, InputOtpStyle]), ɵɵInheritDefinitionFeature],
    decls: 1,
    vars: 2,
    consts: [[4, "ngFor", "ngForOf", "ngForTrackBy"], [4, "ngIf"], ["type", "text", "pInputText", "", 3, "input", "focus", "blur", "paste", "keydown", "value", "pSize", "variant", "invalid", "pAutoFocus"], [4, "ngTemplateOutlet", "ngTemplateOutletContext"]],
    template: function InputOtp_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵtemplate(0, InputOtp_ng_container_0_Template, 3, 2, "ng-container", 0);
      }
      if (rf & 2) {
        ɵɵproperty("ngForOf", ctx.getRange(ctx.length))("ngForTrackBy", ctx.trackByFn);
      }
    },
    dependencies: [CommonModule, NgForOf, NgIf, NgTemplateOutlet, InputText, AutoFocus, SharedModule],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InputOtp, [{
    type: Component,
    args: [{
      selector: "p-inputOtp, p-inputotp, p-input-otp",
      standalone: true,
      imports: [CommonModule, InputText, AutoFocus, SharedModule],
      template: `
        <ng-container *ngFor="let i of getRange(length); trackBy: trackByFn">
            <ng-container *ngIf="!inputTemplate && !_inputTemplate">
                <input
                    type="text"
                    pInputText
                    [value]="getModelValue(i)"
                    [attr.maxlength]="i === 1 ? length : 1"
                    [attr.type]="inputType"
                    [class]="cn(cx('pcInputText'), styleClass)"
                    [pSize]="size()"
                    [variant]="$variant()"
                    [invalid]="invalid()"
                    [attr.name]="name()"
                    [attr.tabindex]="tabindex"
                    [attr.required]="required() ? '' : undefined"
                    [attr.readonly]="readonly ? '' : undefined"
                    [attr.disabled]="$disabled() ? '' : undefined"
                    (input)="onInput($event, i - 1)"
                    (focus)="onInputFocus($event)"
                    (blur)="onInputBlur($event)"
                    (paste)="onPaste($event)"
                    (keydown)="onKeyDown($event)"
                    [pAutoFocus]="getAutofocus(i)"
                />
            </ng-container>
            <ng-container *ngIf="inputTemplate || _inputTemplate">
                <ng-container *ngTemplateOutlet="inputTemplate || _inputTemplate; context: { $implicit: getToken(i - 1), events: getTemplateEvents(i - 1), index: i }"> </ng-container>
            </ng-container>
        </ng-container>
    `,
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      providers: [INPUT_OTP_VALUE_ACCESSOR, InputOtpStyle],
      host: {
        "[class]": "cx('root')"
      }
    }]
  }], null, {
    readonly: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    tabindex: [{
      type: Input
    }],
    length: [{
      type: Input
    }],
    styleClass: [{
      type: Input
    }],
    mask: [{
      type: Input
    }],
    integerOnly: [{
      type: Input
    }],
    autofocus: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    onChange: [{
      type: Output
    }],
    onFocus: [{
      type: Output
    }],
    onBlur: [{
      type: Output
    }],
    inputTemplate: [{
      type: ContentChild,
      args: ["input", {
        descendants: false
      }]
    }],
    templates: [{
      type: ContentChildren,
      args: [PrimeTemplate]
    }]
  });
})();
var InputOtpModule = class _InputOtpModule {
  static ɵfac = function InputOtpModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InputOtpModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _InputOtpModule,
    imports: [InputOtp, SharedModule],
    exports: [InputOtp, SharedModule]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [InputOtp, SharedModule, SharedModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(InputOtpModule, [{
    type: NgModule,
    args: [{
      imports: [InputOtp, SharedModule],
      exports: [InputOtp, SharedModule]
    }]
  }], null, null);
})();
export {
  INPUT_OTP_VALUE_ACCESSOR,
  InputOtp,
  InputOtpClasses,
  InputOtpModule,
  InputOtpStyle
};
//# sourceMappingURL=primeng_inputotp.js.map
