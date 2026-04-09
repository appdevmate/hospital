import{Da as R,Ga as L,Ha as q,Ia as f,Ja as h,va as w,wa as v}from"./chunk-NFQQR3AB.js";import{l as Q,p as j,y as O}from"./chunk-2EHTALIL.js";import{$b as m,Cb as r,Db as T,Eb as b,Ib as _,Ob as g,Pb as k,Qb as A,Rb as s,Ta as i,Tb as c,Ub as d,Z as B,_ as x,aa as I,ca as y,eb as M,fb as D,ib as E,jb as S,kb as p,kc as F,va as C,vb as N}from"./chunk-RLBZM6OP.js";var P=`
    .p-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        padding: dt('toolbar.padding');
        background: dt('toolbar.background');
        border: 1px solid dt('toolbar.border.color');
        color: dt('toolbar.color');
        border-radius: dt('toolbar.border.radius');
        gap: dt('toolbar.gap');
    }

    .p-toolbar-start,
    .p-toolbar-center,
    .p-toolbar-end {
        display: flex;
        align-items: center;
    }
`;var $=["start"],z=["end"],G=["center"],J=["*"];function K(e,l){e&1&&_(0)}function U(e,l){if(e&1&&(T(0,"div",1),p(1,K,1,0,"ng-container",2),b()),e&2){let t=g();m(t.cx("start")),r("pBind",t.ptm("start")),i(),r("ngTemplateOutlet",t.startTemplate||t._startTemplate)}}function W(e,l){e&1&&_(0)}function X(e,l){if(e&1&&(T(0,"div",1),p(1,W,1,0,"ng-container",2),b()),e&2){let t=g();m(t.cx("center")),r("pBind",t.ptm("center")),i(),r("ngTemplateOutlet",t.centerTemplate||t._centerTemplate)}}function Y(e,l){e&1&&_(0)}function Z(e,l){if(e&1&&(T(0,"div",1),p(1,Y,1,0,"ng-container",2),b()),e&2){let t=g();m(t.cx("end")),r("pBind",t.ptm("end")),i(),r("ngTemplateOutlet",t.endTemplate||t._endTemplate)}}var ee={root:()=>["p-toolbar p-component"],start:"p-toolbar-start",center:"p-toolbar-center",end:"p-toolbar-end"},V=(()=>{class e extends R{name="toolbar";style=P;classes=ee;static \u0275fac=(()=>{let t;return function(n){return(t||(t=C(e)))(n||e)}})();static \u0275prov=B({token:e,factory:e.\u0275fac})}return e})();var H=new I("TOOLBAR_INSTANCE"),te=(()=>{class e extends q{$pcToolbar=y(H,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=y(f,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}styleClass;ariaLabelledBy;_componentStyle=y(V);getBlockableElement(){return this.el.nativeElement.children[0]}startTemplate;endTemplate;centerTemplate;templates;_startTemplate;_endTemplate;_centerTemplate;onAfterContentInit(){this.templates.forEach(t=>{switch(t.getType()){case"start":case"left":this._startTemplate=t.template;break;case"end":case"right":this._endTemplate=t.template;break;case"center":this._centerTemplate=t.template;break}})}static \u0275fac=(()=>{let t;return function(n){return(t||(t=C(e)))(n||e)}})();static \u0275cmp=M({type:e,selectors:[["p-toolbar"]],contentQueries:function(o,n,u){if(o&1&&(s(u,$,4),s(u,z,4),s(u,G,4),s(u,w,4)),o&2){let a;c(a=d())&&(n.startTemplate=a.first),c(a=d())&&(n.endTemplate=a.first),c(a=d())&&(n.centerTemplate=a.first),c(a=d())&&(n.templates=a)}},hostAttrs:["role","toolbar"],hostVars:3,hostBindings:function(o,n){o&2&&(N("aria-labelledby",n.ariaLabelledBy),m(n.cn(n.cx("root"),n.styleClass)))},inputs:{styleClass:"styleClass",ariaLabelledBy:"ariaLabelledBy"},features:[F([V,{provide:H,useExisting:e},{provide:L,useExisting:e}]),S([f]),E],ngContentSelectors:J,decls:4,vars:3,consts:[[3,"class","pBind",4,"ngIf"],[3,"pBind"],[4,"ngTemplateOutlet"]],template:function(o,n){o&1&&(k(),A(0),p(1,U,2,4,"div",0)(2,X,2,4,"div",0)(3,Z,2,4,"div",0)),o&2&&(i(),r("ngIf",n.startTemplate||n._startTemplate),i(),r("ngIf",n.centerTemplate||n._centerTemplate),i(),r("ngIf",n.endTemplate||n._endTemplate))},dependencies:[O,Q,j,v,h,f],encapsulation:2,changeDetection:0})}return e})(),he=(()=>{class e{static \u0275fac=function(o){return new(o||e)};static \u0275mod=D({type:e});static \u0275inj=x({imports:[te,v,h,v,h]})}return e})();export{te as a,he as b};
