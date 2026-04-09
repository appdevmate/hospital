import{c as ee,d as P,f as b,g as y,h as D}from"./chunk-TBYF2LDC.js";import{c as C}from"./chunk-BODZH67C.js";import{f as he}from"./chunk-5AVPXYL6.js";import{Da as pe,Ga as de,Ha as ue,I as E,Ia as u,Q as re,R as se,c as te,l as ie,r as oe,sa as ae,va as le,wa as g,y as ne,za as ce}from"./chunk-NFQQR3AB.js";import{C as v,l as U,o as X,p as G,y as J}from"./chunk-2EHTALIL.js";import{$b as I,Cb as d,Db as T,Eb as j,Jb as Q,Nb as f,Ob as r,Pb as $,Qb as Y,Rb as S,Rc as m,Sa as B,Sc as K,Ta as w,Tb as x,Ub as L,Z as V,_ as A,aa as H,ca as l,eb as z,fb as R,ha as c,ia as p,ib as F,jb as Z,kb as h,kc as W,mb as k,mc as q,nb as M,nc as O,va as _,vb as N}from"./chunk-RLBZM6OP.js";var ve=["content"],be=["*"],ye=(i,s)=>({showTransitionParams:i,hideTransitionParams:s}),ge=(i,s)=>({value:i,params:s}),Ce=i=>({closeCallback:i});function _e(i,s){}function we(i,s){i&1&&h(0,_e,0,0,"ng-template")}function ke(i,s){if(i&1){let e=Q();T(0,"div",1),f("click",function(o){c(e);let n=r();return p(n.onOverlayClick(o))})("@animation.start",function(o){c(e);let n=r();return p(n.onAnimationStart(o))})("@animation.done",function(o){c(e);let n=r();return p(n.onAnimationEnd(o))}),T(1,"div",2),f("click",function(o){c(e);let n=r();return p(n.onContentClick(o))})("mousedown",function(o){c(e);let n=r();return p(n.onContentClick(o))}),Y(2),h(3,we,1,0,null,3),j()()}if(i&2){let e=r();I(e.cn(e.cx("root"),e.styleClass)),d("pBind",e.ptm("root"))("ngStyle",e.style)("@animation",O(16,ge,e.overlayVisible?"open":"close",O(13,ye,e.showTransitionOptions,e.hideTransitionOptions))),N("aria-modal",e.overlayVisible)("aria-label",e.ariaLabel)("aria-labelledBy",e.ariaLabelledBy),w(),I(e.cx("content")),d("pBind",e.ptm("content")),w(2),d("ngTemplateOutlet",e.contentTemplate||e._contentTemplate)("ngTemplateOutletContext",q(19,Ce,e.onCloseClick.bind(e)))}}var Te=`
.p-popover {
    margin-top: dt('popover.gutter');
    background: dt('popover.background');
    color: dt('popover.color');
    border: 1px solid dt('popover.border.color');
    border-radius: dt('popover.border.radius');
    box-shadow: dt('popover.shadow');
    position: absolute
}

.p-popover-content {
    padding: dt('popover.content.padding');
}

.p-popover-flipped {
    margin-top: calc(dt('popover.gutter') * -1);
    margin-bottom: dt('popover.gutter');
}

.p-popover-enter-from {
    opacity: 0;
    transform: scaleY(0.8);
}

.p-popover-leave-to {
    opacity: 0;
}

.p-popover-enter-active {
    transition: transform 0.12s cubic-bezier(0, 0, 0.2, 1), opacity 0.12s cubic-bezier(0, 0, 0.2, 1);
}

.p-popover-leave-active {
    transition: opacity 0.1s linear;
}

.p-popover:after,
.p-popover:before {
    bottom: 100%;
    left: calc(dt('popover.arrow.offset') + dt('popover.arrow.left'));
    content: " ";
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
}

.p-popover:after {
    border-width: calc(dt('popover.gutter') - 2px);
    margin-left: calc(-1 * (dt('popover.gutter') - 2px));
    border-style: solid;
    border-color: transparent;
    border-bottom-color: dt('popover.background');
}

.p-popover:before {
    border-width: dt('popover.gutter');
    margin-left: calc(-1 * dt('popover.gutter'));
    border-style: solid;
    border-color: transparent;
    border-bottom-color: dt('popover.border.color');
}

.p-popover-flipped:after,
.p-popover-flipped:before {
    bottom: auto;
    top: 100%;
}

.p-popover.p-popover-flipped:after {
    border-bottom-color: transparent;
    border-top-color: dt('popover.background');
}

.p-popover.p-popover-flipped:before {
    border-bottom-color: transparent;
    border-top-color: dt('popover.border.color');
}

`,Se={root:"p-popover p-component",content:"p-popover-content"},fe=(()=>{class i extends pe{name="popover";style=Te;classes=Se;static \u0275fac=(()=>{let e;return function(o){return(e||(e=_(i)))(o||i)}})();static \u0275prov=V({token:i,factory:i.\u0275fac})}return i})(),me=new H("POPOVER_INSTANCE"),xe=(()=>{class i extends ue{$pcPopover=l(me,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=l(u,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptm("host"))}ariaLabel;ariaLabelledBy;dismissable=!0;style;styleClass;appendTo="body";autoZIndex=!0;ariaCloseLabel;baseZIndex=0;focusOnShow=!0;showTransitionOptions=".12s cubic-bezier(0, 0, 0.2, 1)";hideTransitionOptions=".1s linear";onShow=new k;onHide=new k;container;overlayVisible=!1;render=!1;isOverlayAnimationInProgress=!1;selfClick=!1;documentClickListener;target;willHide;scrollHandler;documentResizeListener;contentTemplate;templates;_contentTemplate;destroyCallback;overlayEventListener;overlaySubscription;_componentStyle=l(fe);zone=l(M);overlayService=l(ae);onAfterContentInit(){this.templates.forEach(e=>{switch(e.getType()){case"content":this._contentTemplate=e.template;break}})}bindDocumentClickListener(){if(v(this.platformId)&&!this.documentClickListener){let e=re()?"touchstart":"click",t=this.el?this.el.nativeElement.ownerDocument:this.document;this.documentClickListener=this.renderer.listen(t,e,o=>{this.dismissable&&(!this.container?.contains(o.target)&&this.target!==o.target&&!this.target.contains(o.target)&&!this.selfClick&&this.hide(),this.selfClick=!1,this.cd.markForCheck())})}}unbindDocumentClickListener(){this.documentClickListener&&(this.documentClickListener(),this.documentClickListener=null,this.selfClick=!1)}toggle(e,t){this.isOverlayAnimationInProgress||(this.overlayVisible?(this.hasTargetChanged(e,t)&&(this.destroyCallback=()=>{this.show(null,t||e.currentTarget||e.target)}),this.hide()):this.show(e,t))}show(e,t){t&&e&&e.stopPropagation(),!this.isOverlayAnimationInProgress&&(this.target=t||e.currentTarget||e.target,this.overlayVisible=!0,this.render=!0,this.cd.markForCheck())}onOverlayClick(e){this.overlayService.add({originalEvent:e,target:this.el.nativeElement}),this.selfClick=!0}onContentClick(e){let t=e.target;this.selfClick=e.offsetX<t.clientWidth&&e.offsetY<t.clientHeight}hasTargetChanged(e,t){return this.target!=null&&this.target!==(t||e.currentTarget||e.target)}appendContainer(){this.appendTo&&(this.appendTo==="body"?this.renderer.appendChild(this.document.body,this.container):oe(this.appendTo,this.container))}restoreAppend(){this.container&&this.appendTo&&this.renderer.appendChild(this.el.nativeElement,this.container)}align(){this.autoZIndex&&C.set("overlay",this.container,this.baseZIndex+this.config.zIndex.overlay),ie(this.container,this.target,!1);let e=E(this.container),t=E(this.target),o=this.document.defaultView?.getComputedStyle(this.container).getPropertyValue("border-radius"),n=0;e.left<t.left&&(n=t.left-e.left-parseFloat(o)*2),this.container?.style.setProperty(ce("popover.arrow.left").name,`${n}px`),e.top<t.top&&(this.container?.setAttribute("data-p-popover-flipped","true"),te(this.container,"p-popover-flipped"))}onAnimationStart(e){e.toState==="open"&&(this.container=e.element,this.container?.setAttribute(this.$attrSelector,""),this.appendContainer(),this.align(),this.bindDocumentClickListener(),this.bindDocumentResizeListener(),this.bindScrollListener(),this.focusOnShow&&this.focus(),this.overlayEventListener=t=>{this.container&&this.container.contains(t.target)&&(this.selfClick=!0)},this.overlaySubscription=this.overlayService.clickObservable.subscribe(this.overlayEventListener),this.onShow.emit(null)),this.isOverlayAnimationInProgress=!0}onAnimationEnd(e){switch(e.toState){case"void":this.destroyCallback&&(this.destroyCallback(),this.destroyCallback=null),this.overlaySubscription&&this.overlaySubscription.unsubscribe();break;case"close":this.autoZIndex&&C.clear(this.container),this.overlaySubscription&&this.overlaySubscription.unsubscribe(),this.onContainerDestroy(),this.onHide.emit({}),this.render=!1;break}this.isOverlayAnimationInProgress=!1}focus(){let e=ne(this.container,"[autofocus]");e&&this.zone.runOutsideAngular(()=>{setTimeout(()=>e.focus(),5)})}hide(){this.overlayVisible=!1,this.cd.markForCheck()}onCloseClick(e){this.hide(),e.preventDefault()}onEscapeKeydown(e){this.hide()}onWindowResize(){this.overlayVisible&&!se()&&this.hide()}bindDocumentResizeListener(){if(v(this.platformId)&&!this.documentResizeListener){let e=this.document.defaultView;this.documentResizeListener=this.renderer.listen(e,"resize",this.onWindowResize.bind(this))}}unbindDocumentResizeListener(){this.documentResizeListener&&(this.documentResizeListener(),this.documentResizeListener=null)}bindScrollListener(){v(this.platformId)&&(this.scrollHandler||(this.scrollHandler=new he(this.target,()=>{this.overlayVisible&&this.hide()})),this.scrollHandler.bindScrollListener())}unbindScrollListener(){this.scrollHandler&&this.scrollHandler.unbindScrollListener()}onContainerDestroy(){this.cd.destroyed||(this.target=null),this.unbindDocumentClickListener(),this.unbindDocumentResizeListener(),this.unbindScrollListener()}onDestroy(){this.scrollHandler&&(this.scrollHandler.destroy(),this.scrollHandler=null),this.container&&this.autoZIndex&&C.clear(this.container),this.cd.destroyed||(this.target=null),this.destroyCallback=null,this.container&&(this.restoreAppend(),this.onContainerDestroy()),this.overlaySubscription&&this.overlaySubscription.unsubscribe()}static \u0275fac=(()=>{let e;return function(o){return(e||(e=_(i)))(o||i)}})();static \u0275cmp=z({type:i,selectors:[["p-popover"]],contentQueries:function(t,o,n){if(t&1&&(S(n,ve,4),S(n,le,4)),t&2){let a;x(a=L())&&(o.contentTemplate=a.first),x(a=L())&&(o.templates=a)}},hostBindings:function(t,o){t&1&&f("keydown.escape",function(a){return o.onEscapeKeydown(a)},B)},inputs:{ariaLabel:"ariaLabel",ariaLabelledBy:"ariaLabelledBy",dismissable:[2,"dismissable","dismissable",m],style:"style",styleClass:"styleClass",appendTo:"appendTo",autoZIndex:[2,"autoZIndex","autoZIndex",m],ariaCloseLabel:"ariaCloseLabel",baseZIndex:[2,"baseZIndex","baseZIndex",K],focusOnShow:[2,"focusOnShow","focusOnShow",m],showTransitionOptions:"showTransitionOptions",hideTransitionOptions:"hideTransitionOptions"},outputs:{onShow:"onShow",onHide:"onHide"},features:[W([fe,{provide:me,useExisting:i},{provide:de,useExisting:i}]),Z([u]),F],ngContentSelectors:be,decls:1,vars:1,consts:[["role","dialog",3,"pBind","class","ngStyle","click",4,"ngIf"],["role","dialog",3,"click","pBind","ngStyle"],[3,"click","mousedown","pBind"],[4,"ngTemplateOutlet","ngTemplateOutletContext"]],template:function(t,o){t&1&&($(),h(0,ke,4,21,"div",0)),t&2&&d("ngIf",o.render)},dependencies:[J,U,G,X,g,u],encapsulation:2,data:{animation:[ee("animation",[y("void",b({transform:"scaleY(0.8)",opacity:0})),y("close",b({opacity:0})),y("open",b({transform:"translateY(0)",opacity:1})),D("void => open",P("{{showTransitionParams}}")),D("open => close",P("{{hideTransitionParams}}"))])]},changeDetection:0})}return i})(),Xe=(()=>{class i{static \u0275fac=function(t){return new(t||i)};static \u0275mod=R({type:i});static \u0275inj=A({imports:[xe,g,g]})}return i})();export{xe as a,Xe as b};
