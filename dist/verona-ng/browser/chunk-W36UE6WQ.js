import{a as Y}from"./chunk-6JSQYIJ5.js";import{a as U,e as ut,h as ct,o as gt}from"./chunk-Q46QY2S6.js";import{a as dt}from"./chunk-IG3MAQQN.js";import{$ as P,Da as K,Ga as G,Ia as u,Ja as q,aa as L,va as H,wa as g}from"./chunk-GTIPWYQG.js";import{p as Q,x as j}from"./chunk-RJXWW2TE.js";import{$b as h,Ab as et,Bb as nt,Cb as s,Db as k,Eb as E,Fb as ot,Hc as w,Ib as B,Jb as it,Nb as $,Ob as r,Qc as d,Rb as b,Rc as R,Ta as p,Tb as f,Ub as m,Y as O,Z as S,_ as I,aa as M,ac as lt,bc as at,ca as c,eb as D,fb as F,ha as Z,ia as tt,ib as N,jb as A,jc as z,kb as v,lc as X,mb as x,mc as rt,va as _,vb as V,wb as C,xb as T,yc as st}from"./chunk-45CPZPCB.js";var pt=`
    .p-togglebutton {
        display: inline-flex;
        cursor: pointer;
        user-select: none;
        overflow: hidden;
        position: relative;
        color: dt('togglebutton.color');
        background: dt('togglebutton.background');
        border: 1px solid dt('togglebutton.border.color');
        padding: dt('togglebutton.padding');
        font-size: 1rem;
        font-family: inherit;
        font-feature-settings: inherit;
        transition:
            background dt('togglebutton.transition.duration'),
            color dt('togglebutton.transition.duration'),
            border-color dt('togglebutton.transition.duration'),
            outline-color dt('togglebutton.transition.duration'),
            box-shadow dt('togglebutton.transition.duration');
        border-radius: dt('togglebutton.border.radius');
        outline-color: transparent;
        font-weight: dt('togglebutton.font.weight');
    }

    .p-togglebutton-content {
        display: inline-flex;
        flex: 1 1 auto;
        align-items: center;
        justify-content: center;
        gap: dt('togglebutton.gap');
        padding: dt('togglebutton.content.padding');
        background: transparent;
        border-radius: dt('togglebutton.content.border.radius');
        transition:
            background dt('togglebutton.transition.duration'),
            color dt('togglebutton.transition.duration'),
            border-color dt('togglebutton.transition.duration'),
            outline-color dt('togglebutton.transition.duration'),
            box-shadow dt('togglebutton.transition.duration');
    }

    .p-togglebutton:not(:disabled):not(.p-togglebutton-checked):hover {
        background: dt('togglebutton.hover.background');
        color: dt('togglebutton.hover.color');
    }

    .p-togglebutton.p-togglebutton-checked {
        background: dt('togglebutton.checked.background');
        border-color: dt('togglebutton.checked.border.color');
        color: dt('togglebutton.checked.color');
    }

    .p-togglebutton-checked .p-togglebutton-content {
        background: dt('togglebutton.content.checked.background');
        box-shadow: dt('togglebutton.content.checked.shadow');
    }

    .p-togglebutton:focus-visible {
        box-shadow: dt('togglebutton.focus.ring.shadow');
        outline: dt('togglebutton.focus.ring.width') dt('togglebutton.focus.ring.style') dt('togglebutton.focus.ring.color');
        outline-offset: dt('togglebutton.focus.ring.offset');
    }

    .p-togglebutton.p-invalid {
        border-color: dt('togglebutton.invalid.border.color');
    }

    .p-togglebutton:disabled {
        opacity: 1;
        cursor: default;
        background: dt('togglebutton.disabled.background');
        border-color: dt('togglebutton.disabled.border.color');
        color: dt('togglebutton.disabled.color');
    }

    .p-togglebutton-label,
    .p-togglebutton-icon {
        position: relative;
        transition: none;
    }

    .p-togglebutton-icon {
        color: dt('togglebutton.icon.color');
    }

    .p-togglebutton:not(:disabled):not(.p-togglebutton-checked):hover .p-togglebutton-icon {
        color: dt('togglebutton.icon.hover.color');
    }

    .p-togglebutton.p-togglebutton-checked .p-togglebutton-icon {
        color: dt('togglebutton.icon.checked.color');
    }

    .p-togglebutton:disabled .p-togglebutton-icon {
        color: dt('togglebutton.icon.disabled.color');
    }

    .p-togglebutton-sm {
        padding: dt('togglebutton.sm.padding');
        font-size: dt('togglebutton.sm.font.size');
    }

    .p-togglebutton-sm .p-togglebutton-content {
        padding: dt('togglebutton.content.sm.padding');
    }

    .p-togglebutton-lg {
        padding: dt('togglebutton.lg.padding');
        font-size: dt('togglebutton.lg.font.size');
    }

    .p-togglebutton-lg .p-togglebutton-content {
        padding: dt('togglebutton.content.lg.padding');
    }

    .p-togglebutton-fluid {
        width: 100%;
    }
`;var kt=["icon"],Et=["content"],mt=e=>({$implicit:e});function Bt(e,a){e&1&&B(0)}function wt(e,a){if(e&1&&ot(0,"span",0),e&2){let t=r(3);h(t.cn(t.cx("icon"),t.checked?t.onIcon:t.offIcon,t.iconPos==="left"?t.cx("iconLeft"):t.cx("iconRight"))),s("pBind",t.ptm("icon"))}}function Lt(e,a){if(e&1&&C(0,wt,1,3,"span",2),e&2){let t=r(2);T(t.onIcon||t.offIcon?0:-1)}}function Ot(e,a){e&1&&B(0)}function St(e,a){if(e&1&&v(0,Ot,1,0,"ng-container",1),e&2){let t=r(2);s("ngTemplateOutlet",t.iconTemplate||t._iconTemplate)("ngTemplateOutletContext",X(2,mt,t.checked))}}function It(e,a){if(e&1&&(C(0,Lt,1,1)(1,St,1,4,"ng-container"),k(2,"span",0),lt(3),E()),e&2){let t=r();T(t.iconTemplate?1:0),p(2),h(t.cx("label")),s("pBind",t.ptm("label")),p(),at(t.checked?t.hasOnLabel?t.onLabel:"\xA0":t.hasOffLabel?t.offLabel:"\xA0")}}var Mt=`
    ${pt}

    /* For PrimeNG (iconPos) */
    .p-togglebutton-icon-right {
        order: 1;
    }

    .p-togglebutton.ng-invalid.ng-dirty {
        border-color: dt('togglebutton.invalid.border.color');
    }
`,Dt={root:({instance:e})=>["p-togglebutton p-component",{"p-togglebutton-checked":e.checked,"p-invalid":e.invalid(),"p-disabled":e.$disabled(),"p-togglebutton-sm p-inputfield-sm":e.size==="small","p-togglebutton-lg p-inputfield-lg":e.size==="large","p-togglebutton-fluid":e.fluid()}],content:"p-togglebutton-content",icon:"p-togglebutton-icon",iconLeft:"p-togglebutton-icon-left",iconRight:"p-togglebutton-icon-right",label:"p-togglebutton-label"},bt=(()=>{class e extends K{name="togglebutton";style=Mt;classes=Dt;static \u0275fac=(()=>{let t;return function(o){return(t||(t=_(e)))(o||e)}})();static \u0275prov=S({token:e,factory:e.\u0275fac})}return e})();var ft=new M("TOGGLEBUTTON_INSTANCE"),Ft={provide:U,useExisting:O(()=>J),multi:!0},J=(()=>{class e extends Y{$pcToggleButton=c(ft,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=c(u,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}onKeyDown(t){switch(t.code){case"Enter":this.toggle(t),t.preventDefault();break;case"Space":this.toggle(t),t.preventDefault();break}}toggle(t){!this.$disabled()&&!(this.allowEmpty===!1&&this.checked)&&(this.checked=!this.checked,this.writeModelValue(this.checked),this.onModelChange(this.checked),this.onModelTouched(),this.onChange.emit({originalEvent:t,checked:this.checked}),this.cd.markForCheck())}onLabel="Yes";offLabel="No";onIcon;offIcon;ariaLabel;ariaLabelledBy;styleClass;inputId;tabindex=0;iconPos="left";autofocus;size;allowEmpty;fluid=w(void 0,{transform:d});onChange=new x;iconTemplate;contentTemplate;templates;checked=!1;onInit(){(this.checked===null||this.checked===void 0)&&(this.checked=!1)}_componentStyle=c(bt);onBlur(){this.onModelTouched()}get hasOnLabel(){return this.onLabel&&this.onLabel.length>0}get hasOffLabel(){return this.offLabel&&this.offLabel.length>0}get active(){return this.checked===!0}_iconTemplate;_contentTemplate;onAfterContentInit(){this.templates.forEach(t=>{switch(t.getType()){case"icon":this._iconTemplate=t.template;break;case"content":this._contentTemplate=t.template;break;default:this._contentTemplate=t.template;break}})}writeControlValue(t,n){this.checked=t,n(t),this.cd.markForCheck()}static \u0275fac=(()=>{let t;return function(o){return(t||(t=_(e)))(o||e)}})();static \u0275cmp=D({type:e,selectors:[["p-toggleButton"],["p-togglebutton"],["p-toggle-button"]],contentQueries:function(n,o,i){if(n&1&&(b(i,kt,4),b(i,Et,4),b(i,H,4)),n&2){let l;f(l=m())&&(o.iconTemplate=l.first),f(l=m())&&(o.contentTemplate=l.first),f(l=m())&&(o.templates=l)}},hostVars:8,hostBindings:function(n,o){n&1&&$("keydown",function(l){return o.onKeyDown(l)})("click",function(l){return o.toggle(l)}),n&2&&(V("aria-labelledby",o.ariaLabelledBy)("aria-label",o.ariaLabel)("aria-pressed",o.checked?"true":"false")("role","button")("tabindex",o.tabindex!==void 0?o.tabindex:o.$disabled()?-1:0)("data-pc-name","togglebutton"),h(o.cn(o.cx("root"),o.styleClass)))},inputs:{onLabel:"onLabel",offLabel:"offLabel",onIcon:"onIcon",offIcon:"offIcon",ariaLabel:"ariaLabel",ariaLabelledBy:"ariaLabelledBy",styleClass:"styleClass",inputId:"inputId",tabindex:[2,"tabindex","tabindex",R],iconPos:"iconPos",autofocus:[2,"autofocus","autofocus",d],size:"size",allowEmpty:"allowEmpty",fluid:[1,"fluid"]},outputs:{onChange:"onChange"},features:[z([Ft,bt,{provide:ft,useExisting:e},{provide:G,useExisting:e}]),A([dt,u]),N],decls:3,vars:8,consts:[[3,"pBind"],[4,"ngTemplateOutlet","ngTemplateOutletContext"],[3,"class","pBind"]],template:function(n,o){n&1&&(k(0,"span",0),v(1,Bt,1,0,"ng-container",1),C(2,It,4,5),E()),n&2&&(h(o.cx("content")),s("pBind",o.ptm("content")),p(),s("ngTemplateOutlet",o.contentTemplate||o._contentTemplate)("ngTemplateOutletContext",X(6,mt,o.checked)),p(),T(o.contentTemplate?-1:2))},dependencies:[j,Q,g,q,u],encapsulation:2,changeDetection:0})}return e})(),ce=(()=>{class e{static \u0275fac=function(n){return new(n||e)};static \u0275mod=F({type:e});static \u0275inj=I({imports:[J,g,g]})}return e})();var ht=`
    .p-selectbutton {
        display: inline-flex;
        user-select: none;
        vertical-align: bottom;
        outline-color: transparent;
        border-radius: dt('selectbutton.border.radius');
    }

    .p-selectbutton .p-togglebutton {
        border-radius: 0;
        border-width: 1px 1px 1px 0;
    }

    .p-selectbutton .p-togglebutton:focus-visible {
        position: relative;
        z-index: 1;
    }

    .p-selectbutton .p-togglebutton:first-child {
        border-inline-start-width: 1px;
        border-start-start-radius: dt('selectbutton.border.radius');
        border-end-start-radius: dt('selectbutton.border.radius');
    }

    .p-selectbutton .p-togglebutton:last-child {
        border-start-end-radius: dt('selectbutton.border.radius');
        border-end-end-radius: dt('selectbutton.border.radius');
    }

    .p-selectbutton.p-invalid {
        outline: 1px solid dt('selectbutton.invalid.border.color');
        outline-offset: 0;
    }

    .p-selectbutton-fluid {
        width: 100%;
    }
    
    .p-selectbutton-fluid .p-togglebutton {
        flex: 1 1 0;
    }
`;var Nt=["item"],At=(e,a)=>({$implicit:e,index:a});function Vt(e,a){return this.getOptionLabel(a)}function $t(e,a){e&1&&B(0)}function zt(e,a){if(e&1&&v(0,$t,1,0,"ng-container",3),e&2){let t=r(2),n=t.$implicit,o=t.$index,i=r();s("ngTemplateOutlet",i.itemTemplate||i._itemTemplate)("ngTemplateOutletContext",rt(2,At,n,o))}}function Rt(e,a){e&1&&v(0,zt,1,5,"ng-template",null,0,st)}function Qt(e,a){if(e&1){let t=it();k(0,"p-togglebutton",2),$("onChange",function(o){let i=Z(t),l=i.$implicit,y=i.$index,W=r();return tt(W.onOptionSelect(o,l,y))}),C(1,Rt,2,0),E()}if(e&2){let t=a.$implicit,n=r();s("autofocus",n.autofocus)("styleClass",n.styleClass)("ngModel",n.isSelected(t))("onLabel",n.getOptionLabel(t))("offLabel",n.getOptionLabel(t))("disabled",n.$disabled()||n.isOptionDisabled(t))("allowEmpty",n.getAllowEmpty())("size",n.size())("fluid",n.fluid())("pt",n.ptm("pcToggleButton")),p(),T(n.itemTemplate||n._itemTemplate?1:-1)}}var jt=`
    ${ht}

    /* For PrimeNG */
    .p-selectbutton.ng-invalid.ng-dirty {
        outline: 1px solid dt('selectbutton.invalid.border.color');
        outline-offset: 0;
    }
`,Pt={root:({instance:e})=>["p-selectbutton p-component",{"p-invalid":e.invalid(),"p-selectbutton-fluid":e.fluid()}]},yt=(()=>{class e extends K{name="selectbutton";style=jt;classes=Pt;static \u0275fac=(()=>{let t;return function(o){return(t||(t=_(e)))(o||e)}})();static \u0275prov=S({token:e,factory:e.\u0275fac})}return e})();var _t=new M("SELECTBUTTON_INSTANCE"),Ht={provide:U,useExisting:O(()=>vt),multi:!0},vt=(()=>{class e extends Y{options;optionLabel;optionValue;optionDisabled;get unselectable(){return this._unselectable}_unselectable=!1;set unselectable(t){this._unselectable=t,this.allowEmpty=!t}tabindex=0;multiple;allowEmpty=!0;styleClass;ariaLabelledBy;dataKey;autofocus;size=w();fluid=w(void 0,{transform:d});onOptionClick=new x;onChange=new x;itemTemplate;_itemTemplate;get equalityKey(){return this.optionValue?null:this.dataKey}value;focusedIndex=0;_componentStyle=c(yt);$pcSelectButton=c(_t,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=c(u,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}getAllowEmpty(){return this.multiple?this.allowEmpty||this.value?.length!==1:this.allowEmpty}getOptionLabel(t){return this.optionLabel?P(t,this.optionLabel):t.label!=null?t.label:t}getOptionValue(t){return this.optionValue?P(t,this.optionValue):this.optionLabel||t.value===void 0?t:t.value}isOptionDisabled(t){return this.optionDisabled?P(t,this.optionDisabled):t.disabled!==void 0?t.disabled:!1}onOptionSelect(t,n,o){if(this.$disabled()||this.isOptionDisabled(n))return;let i=this.isSelected(n);if(i&&this.unselectable)return;let l=this.getOptionValue(n),y;if(this.multiple)i?y=this.value.filter(W=>!L(W,l,this.equalityKey||void 0)):y=this.value?[...this.value,l]:[l];else{if(i&&!this.allowEmpty)return;y=i?null:l}this.focusedIndex=o,this.value=y,this.writeModelValue(this.value),this.onModelChange(this.value),this.onChange.emit({originalEvent:t,value:this.value}),this.onOptionClick.emit({originalEvent:t,option:n,index:o})}changeTabIndexes(t,n){let o,i;for(let l=0;l<=this.el.nativeElement.children.length-1;l++)this.el.nativeElement.children[l].getAttribute("tabindex")==="0"&&(o={elem:this.el.nativeElement.children[l],index:l});n==="prev"?o.index===0?i=this.el.nativeElement.children.length-1:i=o.index-1:o.index===this.el.nativeElement.children.length-1?i=0:i=o.index+1,this.focusedIndex=i,this.el.nativeElement.children[i].focus()}onFocus(t,n){this.focusedIndex=n}onBlur(){this.onModelTouched()}removeOption(t){this.value=this.value.filter(n=>!L(n,this.getOptionValue(t),this.dataKey))}isSelected(t){let n=!1,o=this.getOptionValue(t);if(this.multiple){if(this.value&&Array.isArray(this.value)){for(let i of this.value)if(L(i,o,this.dataKey)){n=!0;break}}}else n=L(this.getOptionValue(t),this.value,this.equalityKey||void 0);return n}templates;onAfterContentInit(){this.templates.forEach(t=>{switch(t.getType()){case"item":this._itemTemplate=t.template;break}})}writeControlValue(t,n){this.value=t,n(this.value),this.cd.markForCheck()}static \u0275fac=(()=>{let t;return function(o){return(t||(t=_(e)))(o||e)}})();static \u0275cmp=D({type:e,selectors:[["p-selectButton"],["p-selectbutton"],["p-select-button"]],contentQueries:function(n,o,i){if(n&1&&(b(i,Nt,4),b(i,H,4)),n&2){let l;f(l=m())&&(o.itemTemplate=l.first),f(l=m())&&(o.templates=l)}},hostVars:4,hostBindings:function(n,o){n&2&&(V("role","group")("aria-labelledby",o.ariaLabelledBy),h(o.cx("root")))},inputs:{options:"options",optionLabel:"optionLabel",optionValue:"optionValue",optionDisabled:"optionDisabled",unselectable:[2,"unselectable","unselectable",d],tabindex:[2,"tabindex","tabindex",R],multiple:[2,"multiple","multiple",d],allowEmpty:[2,"allowEmpty","allowEmpty",d],styleClass:"styleClass",ariaLabelledBy:"ariaLabelledBy",dataKey:"dataKey",autofocus:[2,"autofocus","autofocus",d],size:[1,"size"],fluid:[1,"fluid"]},outputs:{onOptionClick:"onOptionClick",onChange:"onChange"},features:[z([Ht,yt,{provide:_t,useExisting:e},{provide:G,useExisting:e}]),A([u]),N],decls:2,vars:0,consts:[["content",""],[3,"autofocus","styleClass","ngModel","onLabel","offLabel","disabled","allowEmpty","size","fluid","pt"],[3,"onChange","autofocus","styleClass","ngModel","onLabel","offLabel","disabled","allowEmpty","size","fluid","pt"],[4,"ngTemplateOutlet","ngTemplateOutletContext"]],template:function(n,o){n&1&&et(0,Qt,2,11,"p-togglebutton",1,Vt,!0),n&2&&nt(o.options)},dependencies:[J,gt,ut,ct,j,Q,g,q],encapsulation:2,changeDetection:0})}return e})(),Ae=(()=>{class e{static \u0275fac=function(n){return new(n||e)};static \u0275mod=F({type:e});static \u0275inj=I({imports:[vt,g,g]})}return e})();export{J as a,ce as b,vt as c,Ae as d};
