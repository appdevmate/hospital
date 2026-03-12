import{Da as C,Ga as N,Ha as D,Ia as s,Ja as F,wa as v}from"./chunk-CCVU2434.js";import{x as I}from"./chunk-4FGG4OVW.js";import{$b as h,Pb as m,Qb as g,Z as c,_ as d,aa as a,ca as o,eb as l,fb as p,ib as f,jb as u,jc as y,va as r}from"./chunk-QQDNL2ZL.js";var M=`
    .p-iconfield {
        position: relative;
        display: block;
    }

    .p-inputicon {
        position: absolute;
        top: 50%;
        margin-top: calc(-1 * (dt('icon.size') / 2));
        color: dt('iconfield.icon.color');
        line-height: 1;
        z-index: 1;
    }

    .p-iconfield .p-inputicon:first-child {
        inset-inline-start: dt('form.field.padding.x');
    }

    .p-iconfield .p-inputicon:last-child {
        inset-inline-end: dt('form.field.padding.x');
    }

    .p-iconfield .p-inputtext:not(:first-child),
    .p-iconfield .p-inputwrapper:not(:first-child) .p-inputtext {
        padding-inline-start: calc((dt('form.field.padding.x') * 2) + dt('icon.size'));
    }

    .p-iconfield .p-inputtext:not(:last-child) {
        padding-inline-end: calc((dt('form.field.padding.x') * 2) + dt('icon.size'));
    }

    .p-iconfield:has(.p-inputfield-sm) .p-inputicon {
        font-size: dt('form.field.sm.font.size');
        width: dt('form.field.sm.font.size');
        height: dt('form.field.sm.font.size');
        margin-top: calc(-1 * (dt('form.field.sm.font.size') / 2));
    }

    .p-iconfield:has(.p-inputfield-lg) .p-inputicon {
        font-size: dt('form.field.lg.font.size');
        width: dt('form.field.lg.font.size');
        height: dt('form.field.lg.font.size');
        margin-top: calc(-1 * (dt('form.field.lg.font.size') / 2));
    }
`;var T=["*"],A={root:({instance:e})=>["p-iconfield",{"p-iconfield-left":e.iconPosition=="left","p-iconfield-right":e.iconPosition=="right"}]},x=(()=>{class e extends C{name="iconfield";style=M;classes=A;static \u0275fac=(()=>{let t;return function(n){return(t||(t=r(e)))(n||e)}})();static \u0275prov=c({token:e,factory:e.\u0275fac})}return e})();var B=new a("ICONFIELD_INSTANCE"),w=(()=>{class e extends D{hostName="";_componentStyle=o(x);$pcIconField=o(B,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=o(s,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}iconPosition="left";styleClass;static \u0275fac=(()=>{let t;return function(n){return(t||(t=r(e)))(n||e)}})();static \u0275cmp=l({type:e,selectors:[["p-iconfield"],["p-iconField"],["p-icon-field"]],hostVars:2,hostBindings:function(i,n){i&2&&h(n.cn(n.cx("root"),n.styleClass))},inputs:{hostName:"hostName",iconPosition:"iconPosition",styleClass:"styleClass"},features:[y([x,{provide:B,useExisting:e},{provide:N,useExisting:e}]),u([s]),f],ngContentSelectors:T,decls:1,vars:0,template:function(i,n){i&1&&(m(),g(0))},dependencies:[I,F],encapsulation:2,changeDetection:0})}return e})(),W=(()=>{class e{static \u0275fac=function(i){return new(i||e)};static \u0275mod=p({type:e});static \u0275inj=d({imports:[w]})}return e})();var P=["*"],b={root:"p-inputicon"},S=(()=>{class e extends C{name="inputicon";classes=b;static \u0275fac=(()=>{let t;return function(n){return(t||(t=r(e)))(n||e)}})();static \u0275prov=c({token:e,factory:e.\u0275fac})}return e})(),j=new a("INPUTICON_INSTANCE"),k=(()=>{class e extends D{hostName="";styleClass;_componentStyle=o(S);$pcInputIcon=o(j,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=o(s,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}static \u0275fac=(()=>{let t;return function(n){return(t||(t=r(e)))(n||e)}})();static \u0275cmp=l({type:e,selectors:[["p-inputicon"],["p-inputIcon"]],hostVars:2,hostBindings:function(i,n){i&2&&h(n.cn(n.cx("root"),n.styleClass))},inputs:{hostName:"hostName",styleClass:"styleClass"},features:[y([S,{provide:j,useExisting:e},{provide:N,useExisting:e}]),u([s]),f],ngContentSelectors:P,decls:1,vars:0,template:function(i,n){i&1&&(m(),g(0))},dependencies:[I,v,F],encapsulation:2,changeDetection:0})}return e})(),le=(()=>{class e{static \u0275fac=function(i){return new(i||e)};static \u0275mod=p({type:e});static \u0275inj=d({imports:[k,v,v]})}return e})();export{w as a,W as b,k as c,le as d};
