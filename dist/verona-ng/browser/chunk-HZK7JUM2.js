import{a as Z}from"./chunk-6BFCXMO4.js";import{a as Q,e as U}from"./chunk-KWZRC56O.js";import{g as H}from"./chunk-5AVPXYL6.js";import{Da as O,Ga as G,Ia as u,Ja as q,wa as p}from"./chunk-NFQQR3AB.js";import{y as $}from"./chunk-2EHTALIL.js";import{$b as a,Cb as l,Db as m,Eb as v,Ec as j,Fb as z,Ic as y,Jb as E,Nb as A,Rc as k,Sb as N,Sc as L,Ta as g,Tb as S,Ub as T,Y as B,Z as h,_ as x,aa as I,ca as r,eb as M,fb as F,ha as s,ia as c,ib as D,jb as _,kc as R,la as C,mb as b,va as f,vb as V}from"./chunk-RLBZM6OP.js";var P=`
    .p-radiobutton {
        position: relative;
        display: inline-flex;
        user-select: none;
        vertical-align: bottom;
        width: dt('radiobutton.width');
        height: dt('radiobutton.height');
    }

    .p-radiobutton-input {
        cursor: pointer;
        appearance: none;
        position: absolute;
        top: 0;
        inset-inline-start: 0;
        width: 100%;
        height: 100%;
        padding: 0;
        margin: 0;
        opacity: 0;
        z-index: 1;
        outline: 0 none;
        border: 1px solid transparent;
        border-radius: 50%;
    }

    .p-radiobutton-box {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        border: 1px solid dt('radiobutton.border.color');
        background: dt('radiobutton.background');
        width: dt('radiobutton.width');
        height: dt('radiobutton.height');
        transition:
            background dt('radiobutton.transition.duration'),
            color dt('radiobutton.transition.duration'),
            border-color dt('radiobutton.transition.duration'),
            box-shadow dt('radiobutton.transition.duration'),
            outline-color dt('radiobutton.transition.duration');
        outline-color: transparent;
        box-shadow: dt('radiobutton.shadow');
    }

    .p-radiobutton-icon {
        transition-duration: dt('radiobutton.transition.duration');
        background: transparent;
        font-size: dt('radiobutton.icon.size');
        width: dt('radiobutton.icon.size');
        height: dt('radiobutton.icon.size');
        border-radius: 50%;
        backface-visibility: hidden;
        transform: translateZ(0) scale(0.1);
    }

    .p-radiobutton:not(.p-disabled):has(.p-radiobutton-input:hover) .p-radiobutton-box {
        border-color: dt('radiobutton.hover.border.color');
    }

    .p-radiobutton-checked .p-radiobutton-box {
        border-color: dt('radiobutton.checked.border.color');
        background: dt('radiobutton.checked.background');
    }

    .p-radiobutton-checked .p-radiobutton-box .p-radiobutton-icon {
        background: dt('radiobutton.icon.checked.color');
        transform: translateZ(0) scale(1, 1);
        visibility: visible;
    }

    .p-radiobutton-checked:not(.p-disabled):has(.p-radiobutton-input:hover) .p-radiobutton-box {
        border-color: dt('radiobutton.checked.hover.border.color');
        background: dt('radiobutton.checked.hover.background');
    }

    .p-radiobutton:not(.p-disabled):has(.p-radiobutton-input:hover).p-radiobutton-checked .p-radiobutton-box .p-radiobutton-icon {
        background: dt('radiobutton.icon.checked.hover.color');
    }

    .p-radiobutton:not(.p-disabled):has(.p-radiobutton-input:focus-visible) .p-radiobutton-box {
        border-color: dt('radiobutton.focus.border.color');
        box-shadow: dt('radiobutton.focus.ring.shadow');
        outline: dt('radiobutton.focus.ring.width') dt('radiobutton.focus.ring.style') dt('radiobutton.focus.ring.color');
        outline-offset: dt('radiobutton.focus.ring.offset');
    }

    .p-radiobutton-checked:not(.p-disabled):has(.p-radiobutton-input:focus-visible) .p-radiobutton-box {
        border-color: dt('radiobutton.checked.focus.border.color');
    }

    .p-radiobutton.p-invalid > .p-radiobutton-box {
        border-color: dt('radiobutton.invalid.border.color');
    }

    .p-radiobutton.p-variant-filled .p-radiobutton-box {
        background: dt('radiobutton.filled.background');
    }

    .p-radiobutton.p-variant-filled.p-radiobutton-checked .p-radiobutton-box {
        background: dt('radiobutton.checked.background');
    }

    .p-radiobutton.p-variant-filled:not(.p-disabled):has(.p-radiobutton-input:hover).p-radiobutton-checked .p-radiobutton-box {
        background: dt('radiobutton.checked.hover.background');
    }

    .p-radiobutton.p-disabled {
        opacity: 1;
    }

    .p-radiobutton.p-disabled .p-radiobutton-box {
        background: dt('radiobutton.disabled.background');
        border-color: dt('radiobutton.checked.disabled.border.color');
    }

    .p-radiobutton-checked.p-disabled .p-radiobutton-box .p-radiobutton-icon {
        background: dt('radiobutton.icon.disabled.color');
    }

    .p-radiobutton-sm,
    .p-radiobutton-sm .p-radiobutton-box {
        width: dt('radiobutton.sm.width');
        height: dt('radiobutton.sm.height');
    }

    .p-radiobutton-sm .p-radiobutton-icon {
        font-size: dt('radiobutton.icon.sm.size');
        width: dt('radiobutton.icon.sm.size');
        height: dt('radiobutton.icon.sm.size');
    }

    .p-radiobutton-lg,
    .p-radiobutton-lg .p-radiobutton-box {
        width: dt('radiobutton.lg.width');
        height: dt('radiobutton.lg.height');
    }

    .p-radiobutton-lg .p-radiobutton-icon {
        font-size: dt('radiobutton.icon.lg.size');
        width: dt('radiobutton.icon.lg.size');
        height: dt('radiobutton.icon.lg.size');
    }
`;var X=["input"],Y=`
    ${P}

    /* For PrimeNG */
    p-radioButton.ng-invalid.ng-dirty .p-radiobutton-box,
    p-radio-button.ng-invalid.ng-dirty .p-radiobutton-box,
    p-radiobutton.ng-invalid.ng-dirty .p-radiobutton-box {
        border-color: dt('radiobutton.invalid.border.color');
    }
`,tt={root:({instance:o})=>["p-radiobutton p-component",{"p-radiobutton-checked":o.checked,"p-disabled":o.$disabled(),"p-invalid":o.invalid(),"p-variant-filled":o.$variant()==="filled","p-radiobutton-sm p-inputfield-sm":o.size()==="small","p-radiobutton-lg p-inputfield-lg":o.size()==="large"}],box:"p-radiobutton-box",input:"p-radiobutton-input",icon:"p-radiobutton-icon"},J=(()=>{class o extends O{name="radiobutton";style=Y;classes=tt;static \u0275fac=(()=>{let t;return function(n){return(t||(t=f(o)))(n||o)}})();static \u0275prov=h({token:o,factory:o.\u0275fac})}return o})();var K=new I("RADIOBUTTON_INSTANCE"),ot={provide:Q,useExisting:B(()=>W),multi:!0},nt=(()=>{class o{accessors=[];add(t,i){this.accessors.push([t,i])}remove(t){this.accessors=this.accessors.filter(i=>i[1]!==t)}select(t){this.accessors.forEach(i=>{this.isSameGroup(i,t)&&i[1]!==t&&i[1].writeValue(t.value)})}isSameGroup(t,i){return t[0].control?t[0].control.root===i.control.control.root&&t[1].name()===i.name():!1}static \u0275fac=function(i){return new(i||o)};static \u0275prov=h({token:o,factory:o.\u0275fac,providedIn:"root"})}return o})(),W=(()=>{class o extends Z{$pcRadioButton=r(K,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=r(u,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}value;tabindex;inputId;ariaLabelledBy;ariaLabel;styleClass;autofocus;binary;variant=y();size=y();onClick=new b;onFocus=new b;onBlur=new b;inputViewChild;$variant=j(()=>this.variant()||this.config.inputStyle()||this.config.inputVariant());checked;focused;control;_componentStyle=r(J);injector=r(C);registry=r(nt);onInit(){this.control=this.injector.get(U),this.registry.add(this.control,this)}onChange(t){this.$disabled()||this.select(t)}select(t){this.$disabled()||(this.checked=!0,this.writeModelValue(this.checked),this.onModelChange(this.value),this.registry.select(this),this.onClick.emit({originalEvent:t,value:this.value}))}onInputFocus(t){this.focused=!0,this.onFocus.emit(t)}onInputBlur(t){this.focused=!1,this.onModelTouched(),this.onBlur.emit(t)}focus(){this.inputViewChild.nativeElement.focus()}writeControlValue(t,i){this.checked=this.binary?!!t:t==this.value,i(this.checked),this.cd.markForCheck()}onDestroy(){this.registry.remove(this)}static \u0275fac=(()=>{let t;return function(n){return(t||(t=f(o)))(n||o)}})();static \u0275cmp=M({type:o,selectors:[["p-radioButton"],["p-radiobutton"],["p-radio-button"]],viewQuery:function(i,n){if(i&1&&N(X,5),i&2){let e;S(e=T())&&(n.inputViewChild=e.first)}},hostVars:2,hostBindings:function(i,n){i&2&&a(n.cx("root"))},inputs:{value:"value",tabindex:[2,"tabindex","tabindex",L],inputId:"inputId",ariaLabelledBy:"ariaLabelledBy",ariaLabel:"ariaLabel",styleClass:"styleClass",autofocus:[2,"autofocus","autofocus",k],binary:[2,"binary","binary",k],variant:[1,"variant"],size:[1,"size"]},outputs:{onClick:"onClick",onFocus:"onFocus",onBlur:"onBlur"},features:[R([ot,J,{provide:K,useExisting:o},{provide:G,useExisting:o}]),_([u]),D],decls:4,vars:20,consts:[["input",""],["type","radio",3,"focus","blur","change","checked","pAutoFocus","pBind"],[3,"pBind"]],template:function(i,n){if(i&1){let e=E();m(0,"input",1,0),A("focus",function(d){return s(e),c(n.onInputFocus(d))})("blur",function(d){return s(e),c(n.onInputBlur(d))})("change",function(d){return s(e),c(n.onChange(d))}),v(),m(2,"div",2),z(3,"div",2),v()}i&2&&(a(n.cx("input")),l("checked",n.checked)("pAutoFocus",n.autofocus)("pBind",n.ptm("input")),V("id",n.inputId)("name",n.name())("required",n.required()?"":void 0)("disabled",n.$disabled()?"":void 0)("value",n.modelValue())("aria-labelledby",n.ariaLabelledBy)("aria-label",n.ariaLabel)("aria-checked",n.checked)("tabindex",n.tabindex),g(2),a(n.cx("box")),l("pBind",n.ptm("box")),g(),a(n.cx("icon")),l("pBind",n.ptm("icon")))},dependencies:[$,H,p,q,u],encapsulation:2,changeDetection:0})}return o})(),xt=(()=>{class o{static \u0275fac=function(i){return new(i||o)};static \u0275mod=F({type:o});static \u0275inj=x({imports:[W,p,p]})}return o})();export{W as a,xt as b};
