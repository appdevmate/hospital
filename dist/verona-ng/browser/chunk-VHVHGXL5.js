import{Da as C,Ga as I,Ha as M,Ia as s,wa as r}from"./chunk-4WCMFDMB.js";import{y as S}from"./chunk-6NZQOL7W.js";import{$b as b,Z as c,_ as p,_b as k,aa as m,ca as o,eb as u,fb as f,ib as h,jb as g,jc as v,va as d,vb as y}from"./chunk-XGLBEODP.js";import{a,b as l}from"./chunk-GAL4ENT6.js";var w=`
    .p-skeleton {
        display: block;
        overflow: hidden;
        background: dt('skeleton.background');
        border-radius: dt('skeleton.border.radius');
    }

    .p-skeleton::after {
        content: '';
        animation: p-skeleton-animation 1.2s infinite;
        height: 100%;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        transform: translateX(-100%);
        z-index: 1;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0), dt('skeleton.animation.background'), rgba(255, 255, 255, 0));
    }

    [dir='rtl'] .p-skeleton::after {
        animation-name: p-skeleton-animation-rtl;
    }

    .p-skeleton-circle {
        border-radius: 50%;
    }

    .p-skeleton-animation-none::after {
        animation: none;
    }

    @keyframes p-skeleton-animation {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(100%);
        }
    }

    @keyframes p-skeleton-animation-rtl {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(-100%);
        }
    }
`;var N={root:{position:"relative"}},F={root:({instance:e})=>["p-skeleton p-component",{"p-skeleton-circle":e.shape==="circle","p-skeleton-animation-none":e.animation==="none"}]},D=(()=>{class e extends C{name="skeleton";style=w;classes=F;inlineStyles=N;static \u0275fac=(()=>{let n;return function(i){return(n||(n=d(e)))(i||e)}})();static \u0275prov=c({token:e,factory:e.\u0275fac})}return e})();var E=new m("SKELETON_INSTANCE"),B=(()=>{class e extends M{$pcSkeleton=o(E,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=o(s,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}styleClass;shape="rectangle";animation="wave";borderRadius;size;width="100%";height="1rem";_componentStyle=o(D);get containerStyle(){let n=this._componentStyle?.inlineStyles.root,t;return this.size?t=l(a({},n),{width:this.size,height:this.size,borderRadius:this.borderRadius}):t=l(a({},n),{width:this.width,height:this.height,borderRadius:this.borderRadius}),t}static \u0275fac=(()=>{let n;return function(i){return(n||(n=d(e)))(i||e)}})();static \u0275cmp=u({type:e,selectors:[["p-skeleton"]],hostVars:5,hostBindings:function(t,i){t&2&&(y("aria-hidden",!0),k(i.containerStyle),b(i.cn(i.cx("root"),i.styleClass)))},inputs:{styleClass:"styleClass",shape:"shape",animation:"animation",borderRadius:"borderRadius",size:"size",width:"width",height:"height"},features:[v([D,{provide:E,useExisting:e},{provide:I,useExisting:e}]),g([s]),h],decls:0,vars:0,template:function(t,i){},dependencies:[S,r],encapsulation:2,changeDetection:0})}return e})(),G=(()=>{class e{static \u0275fac=function(t){return new(t||e)};static \u0275mod=f({type:e});static \u0275inj=p({imports:[B,r,r]})}return e})();export{B as a,G as b};
