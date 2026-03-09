import{Da as q,Ga as O,Ha as U,Ia as o,wa as d}from"./chunk-RJJCKMP7.js";import{i as R,l as H,x as P}from"./chunk-BLRELGOL.js";import{$b as c,Cb as i,Db as u,Eb as x,Fb as D,Jb as N,Nb as S,Ob as r,Pb as F,Qa as E,Qb as j,Ta as v,Xb as h,Z as b,_ as y,aa as I,ac as L,bc as V,ca as s,eb as B,fb as w,ha as z,ia as C,ib as A,ic as k,jb as T,kb as p,mb as M,va as m,vb as f,xc as _}from"./chunk-QR6Z6AA6.js";var $=`
    .p-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: dt('avatar.width');
        height: dt('avatar.height');
        font-size: dt('avatar.font.size');
        background: dt('avatar.background');
        color: dt('avatar.color');
        border-radius: dt('avatar.border.radius');
    }

    .p-avatar-image {
        background: transparent;
    }

    .p-avatar-circle {
        border-radius: 50%;
    }

    .p-avatar-circle img {
        border-radius: 50%;
    }

    .p-avatar-icon {
        font-size: dt('avatar.icon.size');
        width: dt('avatar.icon.size');
        height: dt('avatar.icon.size');
    }

    .p-avatar img {
        width: 100%;
        height: 100%;
    }

    .p-avatar-lg {
        width: dt('avatar.lg.width');
        height: dt('avatar.lg.width');
        font-size: dt('avatar.lg.font.size');
    }

    .p-avatar-lg .p-avatar-icon {
        font-size: dt('avatar.lg.icon.size');
        width: dt('avatar.lg.icon.size');
        height: dt('avatar.lg.icon.size');
    }

    .p-avatar-xl {
        width: dt('avatar.xl.width');
        height: dt('avatar.xl.width');
        font-size: dt('avatar.xl.font.size');
    }

    .p-avatar-xl .p-avatar-icon {
        font-size: dt('avatar.xl.icon.size');
        width: dt('avatar.xl.icon.size');
        height: dt('avatar.xl.icon.size');
    }

    .p-avatar-group {
        display: flex;
        align-items: center;
    }

    .p-avatar-group .p-avatar + .p-avatar {
        margin-inline-start: dt('avatar.group.offset');
    }

    .p-avatar-group .p-avatar {
        border: 2px solid dt('avatar.group.border.color');
    }

    .p-avatar-group .p-avatar-lg + .p-avatar-lg {
        margin-inline-start: dt('avatar.lg.group.offset');
    }

    .p-avatar-group .p-avatar-xl + .p-avatar-xl {
        margin-inline-start: dt('avatar.xl.group.offset');
    }
`;var K=["*"];function Q(t,l){if(t&1&&(u(0,"span",3),L(1),x()),t&2){let a=r();c(a.cx("label")),i("pBind",a.ptm("label")),v(),V(a.label)}}function W(t,l){if(t&1&&D(0,"span",5),t&2){let a=r(2);c(a.icon),i("pBind",a.ptm("icon"))("ngClass",a.cx("icon"))}}function X(t,l){if(t&1&&p(0,W,1,4,"span",4),t&2){let a=r(),n=h(5);i("ngIf",a.icon)("ngIfElse",n)}}function Y(t,l){if(t&1){let a=N();u(0,"img",7),S("error",function(e){z(a);let g=r(2);return C(g.imageError(e))}),x()}if(t&2){let a=r(2);i("pBind",a.ptm("image"))("src",a.image,E),f("aria-label",a.ariaLabel)}}function Z(t,l){if(t&1&&p(0,Y,1,3,"img",6),t&2){let a=r();i("ngIf",a.image)}}var tt={root:({instance:t})=>["p-avatar p-component",{"p-avatar-image":t.image!=null,"p-avatar-circle":t.shape==="circle","p-avatar-lg":t.size==="large","p-avatar-xl":t.size==="xlarge"}],label:"p-avatar-label",icon:"p-avatar-icon"},G=(()=>{class t extends q{name="avatar";style=$;classes=tt;static \u0275fac=(()=>{let a;return function(e){return(a||(a=m(t)))(e||t)}})();static \u0275prov=b({token:t,factory:t.\u0275fac})}return t})();var J=new I("AVATAR_INSTANCE"),at=(()=>{class t extends U{$pcAvatar=s(J,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(o,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}label;icon;image;size="normal";shape="square";styleClass;ariaLabel;ariaLabelledBy;onImageError=new M;_componentStyle=s(G);imageError(a){this.onImageError.emit(a)}static \u0275fac=(()=>{let a;return function(e){return(a||(a=m(t)))(e||t)}})();static \u0275cmp=B({type:t,selectors:[["p-avatar"]],hostVars:4,hostBindings:function(n,e){n&2&&(f("aria-label",e.ariaLabel)("aria-labelledby",e.ariaLabelledBy),c(e.cn(e.cx("root"),e.styleClass)))},inputs:{label:"label",icon:"icon",image:"image",size:"size",shape:"shape",styleClass:"styleClass",ariaLabel:"ariaLabel",ariaLabelledBy:"ariaLabelledBy"},outputs:{onImageError:"onImageError"},features:[k([G,{provide:J,useExisting:t},{provide:O,useExisting:t}]),T([o]),A],ngContentSelectors:K,decls:6,vars:2,consts:[["iconTemplate",""],["imageTemplate",""],[3,"pBind","class",4,"ngIf","ngIfElse"],[3,"pBind"],[3,"pBind","class","ngClass",4,"ngIf","ngIfElse"],[3,"pBind","ngClass"],[3,"pBind","src","error",4,"ngIf"],[3,"error","pBind","src"]],template:function(n,e){if(n&1&&(F(),j(0),p(1,Q,2,4,"span",2)(2,X,1,2,"ng-template",null,0,_)(4,Z,1,1,"ng-template",null,1,_)),n&2){let g=h(3);v(),i("ngIf",e.label)("ngIfElse",g)}},dependencies:[P,R,H,d,o],encapsulation:2,changeDetection:0})}return t})(),bt=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=w({type:t});static \u0275inj=y({imports:[at,d,d]})}return t})();export{at as a,bt as b};
