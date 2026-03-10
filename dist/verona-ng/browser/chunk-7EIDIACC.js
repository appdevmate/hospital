import{a as ht,b as ft}from"./chunk-YBHALBOU.js";import{a as pt,g as gt,j as vt}from"./chunk-IG3MAQQN.js";import{a as G}from"./chunk-FYJ7YUJH.js";import{Da as bt,Ga as P,Ha as E,Ia as b,X as q,c as ct,v as U,va as st,wa as z,y as v}from"./chunk-GTIPWYQG.js";import{l as lt,o as ut,p as at,x as R}from"./chunk-RJXWW2TE.js";import{$b as h,Cb as r,Db as L,Dc as V,Eb as j,Ec as A,Fb as C,Gb as N,Hb as F,Hc as f,Ib as Y,Ic as H,Nb as tt,Ob as s,Pb as nt,Qb as ot,Qc as d,Rb as I,Rc as dt,Ta as c,Tb as T,Ub as w,Vb as Q,Wb as et,Z,Zb as M,_ as J,aa as y,ac as rt,bc as it,ca as a,eb as W,fb as X,gb as S,ib as x,ja as K,jb as k,jc as B,kb as g,mb as D,mc as $,va as O,vb as _}from"./chunk-45CPZPCB.js";var mt=`
    .p-button {
        display: inline-flex;
        cursor: pointer;
        user-select: none;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
        color: dt('button.primary.color');
        background: dt('button.primary.background');
        border: 1px solid dt('button.primary.border.color');
        padding: dt('button.padding.y') dt('button.padding.x');
        font-size: 1rem;
        font-family: inherit;
        font-feature-settings: inherit;
        transition:
            background dt('button.transition.duration'),
            color dt('button.transition.duration'),
            border-color dt('button.transition.duration'),
            outline-color dt('button.transition.duration'),
            box-shadow dt('button.transition.duration');
        border-radius: dt('button.border.radius');
        outline-color: transparent;
        gap: dt('button.gap');
    }

    .p-button:disabled {
        cursor: default;
    }

    .p-button-icon-right {
        order: 1;
    }

    .p-button-icon-right:dir(rtl) {
        order: -1;
    }

    .p-button:not(.p-button-vertical) .p-button-icon:not(.p-button-icon-right):dir(rtl) {
        order: 1;
    }

    .p-button-icon-bottom {
        order: 2;
    }

    .p-button-icon-only {
        width: dt('button.icon.only.width');
        padding-inline-start: 0;
        padding-inline-end: 0;
        gap: 0;
    }

    .p-button-icon-only.p-button-rounded {
        border-radius: 50%;
        height: dt('button.icon.only.width');
    }

    .p-button-icon-only .p-button-label {
        visibility: hidden;
        width: 0;
    }

    .p-button-icon-only::after {
        content: "\0A0";
        visibility: hidden;
        width: 0;
    }

    .p-button-sm {
        font-size: dt('button.sm.font.size');
        padding: dt('button.sm.padding.y') dt('button.sm.padding.x');
    }

    .p-button-sm .p-button-icon {
        font-size: dt('button.sm.font.size');
    }

    .p-button-sm.p-button-icon-only {
        width: dt('button.sm.icon.only.width');
    }

    .p-button-sm.p-button-icon-only.p-button-rounded {
        height: dt('button.sm.icon.only.width');
    }

    .p-button-lg {
        font-size: dt('button.lg.font.size');
        padding: dt('button.lg.padding.y') dt('button.lg.padding.x');
    }

    .p-button-lg .p-button-icon {
        font-size: dt('button.lg.font.size');
    }

    .p-button-lg.p-button-icon-only {
        width: dt('button.lg.icon.only.width');
    }

    .p-button-lg.p-button-icon-only.p-button-rounded {
        height: dt('button.lg.icon.only.width');
    }

    .p-button-vertical {
        flex-direction: column;
    }

    .p-button-label {
        font-weight: dt('button.label.font.weight');
    }

    .p-button-fluid {
        width: 100%;
    }

    .p-button-fluid.p-button-icon-only {
        width: dt('button.icon.only.width');
    }

    .p-button:not(:disabled):hover {
        background: dt('button.primary.hover.background');
        border: 1px solid dt('button.primary.hover.border.color');
        color: dt('button.primary.hover.color');
    }

    .p-button:not(:disabled):active {
        background: dt('button.primary.active.background');
        border: 1px solid dt('button.primary.active.border.color');
        color: dt('button.primary.active.color');
    }

    .p-button:focus-visible {
        box-shadow: dt('button.primary.focus.ring.shadow');
        outline: dt('button.focus.ring.width') dt('button.focus.ring.style') dt('button.primary.focus.ring.color');
        outline-offset: dt('button.focus.ring.offset');
    }

    .p-button .p-badge {
        min-width: dt('button.badge.size');
        height: dt('button.badge.size');
        line-height: dt('button.badge.size');
    }

    .p-button-raised {
        box-shadow: dt('button.raised.shadow');
    }

    .p-button-rounded {
        border-radius: dt('button.rounded.border.radius');
    }

    .p-button-secondary {
        background: dt('button.secondary.background');
        border: 1px solid dt('button.secondary.border.color');
        color: dt('button.secondary.color');
    }

    .p-button-secondary:not(:disabled):hover {
        background: dt('button.secondary.hover.background');
        border: 1px solid dt('button.secondary.hover.border.color');
        color: dt('button.secondary.hover.color');
    }

    .p-button-secondary:not(:disabled):active {
        background: dt('button.secondary.active.background');
        border: 1px solid dt('button.secondary.active.border.color');
        color: dt('button.secondary.active.color');
    }

    .p-button-secondary:focus-visible {
        outline-color: dt('button.secondary.focus.ring.color');
        box-shadow: dt('button.secondary.focus.ring.shadow');
    }

    .p-button-success {
        background: dt('button.success.background');
        border: 1px solid dt('button.success.border.color');
        color: dt('button.success.color');
    }

    .p-button-success:not(:disabled):hover {
        background: dt('button.success.hover.background');
        border: 1px solid dt('button.success.hover.border.color');
        color: dt('button.success.hover.color');
    }

    .p-button-success:not(:disabled):active {
        background: dt('button.success.active.background');
        border: 1px solid dt('button.success.active.border.color');
        color: dt('button.success.active.color');
    }

    .p-button-success:focus-visible {
        outline-color: dt('button.success.focus.ring.color');
        box-shadow: dt('button.success.focus.ring.shadow');
    }

    .p-button-info {
        background: dt('button.info.background');
        border: 1px solid dt('button.info.border.color');
        color: dt('button.info.color');
    }

    .p-button-info:not(:disabled):hover {
        background: dt('button.info.hover.background');
        border: 1px solid dt('button.info.hover.border.color');
        color: dt('button.info.hover.color');
    }

    .p-button-info:not(:disabled):active {
        background: dt('button.info.active.background');
        border: 1px solid dt('button.info.active.border.color');
        color: dt('button.info.active.color');
    }

    .p-button-info:focus-visible {
        outline-color: dt('button.info.focus.ring.color');
        box-shadow: dt('button.info.focus.ring.shadow');
    }

    .p-button-warn {
        background: dt('button.warn.background');
        border: 1px solid dt('button.warn.border.color');
        color: dt('button.warn.color');
    }

    .p-button-warn:not(:disabled):hover {
        background: dt('button.warn.hover.background');
        border: 1px solid dt('button.warn.hover.border.color');
        color: dt('button.warn.hover.color');
    }

    .p-button-warn:not(:disabled):active {
        background: dt('button.warn.active.background');
        border: 1px solid dt('button.warn.active.border.color');
        color: dt('button.warn.active.color');
    }

    .p-button-warn:focus-visible {
        outline-color: dt('button.warn.focus.ring.color');
        box-shadow: dt('button.warn.focus.ring.shadow');
    }

    .p-button-help {
        background: dt('button.help.background');
        border: 1px solid dt('button.help.border.color');
        color: dt('button.help.color');
    }

    .p-button-help:not(:disabled):hover {
        background: dt('button.help.hover.background');
        border: 1px solid dt('button.help.hover.border.color');
        color: dt('button.help.hover.color');
    }

    .p-button-help:not(:disabled):active {
        background: dt('button.help.active.background');
        border: 1px solid dt('button.help.active.border.color');
        color: dt('button.help.active.color');
    }

    .p-button-help:focus-visible {
        outline-color: dt('button.help.focus.ring.color');
        box-shadow: dt('button.help.focus.ring.shadow');
    }

    .p-button-danger {
        background: dt('button.danger.background');
        border: 1px solid dt('button.danger.border.color');
        color: dt('button.danger.color');
    }

    .p-button-danger:not(:disabled):hover {
        background: dt('button.danger.hover.background');
        border: 1px solid dt('button.danger.hover.border.color');
        color: dt('button.danger.hover.color');
    }

    .p-button-danger:not(:disabled):active {
        background: dt('button.danger.active.background');
        border: 1px solid dt('button.danger.active.border.color');
        color: dt('button.danger.active.color');
    }

    .p-button-danger:focus-visible {
        outline-color: dt('button.danger.focus.ring.color');
        box-shadow: dt('button.danger.focus.ring.shadow');
    }

    .p-button-contrast {
        background: dt('button.contrast.background');
        border: 1px solid dt('button.contrast.border.color');
        color: dt('button.contrast.color');
    }

    .p-button-contrast:not(:disabled):hover {
        background: dt('button.contrast.hover.background');
        border: 1px solid dt('button.contrast.hover.border.color');
        color: dt('button.contrast.hover.color');
    }

    .p-button-contrast:not(:disabled):active {
        background: dt('button.contrast.active.background');
        border: 1px solid dt('button.contrast.active.border.color');
        color: dt('button.contrast.active.color');
    }

    .p-button-contrast:focus-visible {
        outline-color: dt('button.contrast.focus.ring.color');
        box-shadow: dt('button.contrast.focus.ring.shadow');
    }

    .p-button-outlined {
        background: transparent;
        border-color: dt('button.outlined.primary.border.color');
        color: dt('button.outlined.primary.color');
    }

    .p-button-outlined:not(:disabled):hover {
        background: dt('button.outlined.primary.hover.background');
        border-color: dt('button.outlined.primary.border.color');
        color: dt('button.outlined.primary.color');
    }

    .p-button-outlined:not(:disabled):active {
        background: dt('button.outlined.primary.active.background');
        border-color: dt('button.outlined.primary.border.color');
        color: dt('button.outlined.primary.color');
    }

    .p-button-outlined.p-button-secondary {
        border-color: dt('button.outlined.secondary.border.color');
        color: dt('button.outlined.secondary.color');
    }

    .p-button-outlined.p-button-secondary:not(:disabled):hover {
        background: dt('button.outlined.secondary.hover.background');
        border-color: dt('button.outlined.secondary.border.color');
        color: dt('button.outlined.secondary.color');
    }

    .p-button-outlined.p-button-secondary:not(:disabled):active {
        background: dt('button.outlined.secondary.active.background');
        border-color: dt('button.outlined.secondary.border.color');
        color: dt('button.outlined.secondary.color');
    }

    .p-button-outlined.p-button-success {
        border-color: dt('button.outlined.success.border.color');
        color: dt('button.outlined.success.color');
    }

    .p-button-outlined.p-button-success:not(:disabled):hover {
        background: dt('button.outlined.success.hover.background');
        border-color: dt('button.outlined.success.border.color');
        color: dt('button.outlined.success.color');
    }

    .p-button-outlined.p-button-success:not(:disabled):active {
        background: dt('button.outlined.success.active.background');
        border-color: dt('button.outlined.success.border.color');
        color: dt('button.outlined.success.color');
    }

    .p-button-outlined.p-button-info {
        border-color: dt('button.outlined.info.border.color');
        color: dt('button.outlined.info.color');
    }

    .p-button-outlined.p-button-info:not(:disabled):hover {
        background: dt('button.outlined.info.hover.background');
        border-color: dt('button.outlined.info.border.color');
        color: dt('button.outlined.info.color');
    }

    .p-button-outlined.p-button-info:not(:disabled):active {
        background: dt('button.outlined.info.active.background');
        border-color: dt('button.outlined.info.border.color');
        color: dt('button.outlined.info.color');
    }

    .p-button-outlined.p-button-warn {
        border-color: dt('button.outlined.warn.border.color');
        color: dt('button.outlined.warn.color');
    }

    .p-button-outlined.p-button-warn:not(:disabled):hover {
        background: dt('button.outlined.warn.hover.background');
        border-color: dt('button.outlined.warn.border.color');
        color: dt('button.outlined.warn.color');
    }

    .p-button-outlined.p-button-warn:not(:disabled):active {
        background: dt('button.outlined.warn.active.background');
        border-color: dt('button.outlined.warn.border.color');
        color: dt('button.outlined.warn.color');
    }

    .p-button-outlined.p-button-help {
        border-color: dt('button.outlined.help.border.color');
        color: dt('button.outlined.help.color');
    }

    .p-button-outlined.p-button-help:not(:disabled):hover {
        background: dt('button.outlined.help.hover.background');
        border-color: dt('button.outlined.help.border.color');
        color: dt('button.outlined.help.color');
    }

    .p-button-outlined.p-button-help:not(:disabled):active {
        background: dt('button.outlined.help.active.background');
        border-color: dt('button.outlined.help.border.color');
        color: dt('button.outlined.help.color');
    }

    .p-button-outlined.p-button-danger {
        border-color: dt('button.outlined.danger.border.color');
        color: dt('button.outlined.danger.color');
    }

    .p-button-outlined.p-button-danger:not(:disabled):hover {
        background: dt('button.outlined.danger.hover.background');
        border-color: dt('button.outlined.danger.border.color');
        color: dt('button.outlined.danger.color');
    }

    .p-button-outlined.p-button-danger:not(:disabled):active {
        background: dt('button.outlined.danger.active.background');
        border-color: dt('button.outlined.danger.border.color');
        color: dt('button.outlined.danger.color');
    }

    .p-button-outlined.p-button-contrast {
        border-color: dt('button.outlined.contrast.border.color');
        color: dt('button.outlined.contrast.color');
    }

    .p-button-outlined.p-button-contrast:not(:disabled):hover {
        background: dt('button.outlined.contrast.hover.background');
        border-color: dt('button.outlined.contrast.border.color');
        color: dt('button.outlined.contrast.color');
    }

    .p-button-outlined.p-button-contrast:not(:disabled):active {
        background: dt('button.outlined.contrast.active.background');
        border-color: dt('button.outlined.contrast.border.color');
        color: dt('button.outlined.contrast.color');
    }

    .p-button-outlined.p-button-plain {
        border-color: dt('button.outlined.plain.border.color');
        color: dt('button.outlined.plain.color');
    }

    .p-button-outlined.p-button-plain:not(:disabled):hover {
        background: dt('button.outlined.plain.hover.background');
        border-color: dt('button.outlined.plain.border.color');
        color: dt('button.outlined.plain.color');
    }

    .p-button-outlined.p-button-plain:not(:disabled):active {
        background: dt('button.outlined.plain.active.background');
        border-color: dt('button.outlined.plain.border.color');
        color: dt('button.outlined.plain.color');
    }

    .p-button-text {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.primary.color');
    }

    .p-button-text:not(:disabled):hover {
        background: dt('button.text.primary.hover.background');
        border-color: transparent;
        color: dt('button.text.primary.color');
    }

    .p-button-text:not(:disabled):active {
        background: dt('button.text.primary.active.background');
        border-color: transparent;
        color: dt('button.text.primary.color');
    }

    .p-button-text.p-button-secondary {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.secondary.color');
    }

    .p-button-text.p-button-secondary:not(:disabled):hover {
        background: dt('button.text.secondary.hover.background');
        border-color: transparent;
        color: dt('button.text.secondary.color');
    }

    .p-button-text.p-button-secondary:not(:disabled):active {
        background: dt('button.text.secondary.active.background');
        border-color: transparent;
        color: dt('button.text.secondary.color');
    }

    .p-button-text.p-button-success {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.success.color');
    }

    .p-button-text.p-button-success:not(:disabled):hover {
        background: dt('button.text.success.hover.background');
        border-color: transparent;
        color: dt('button.text.success.color');
    }

    .p-button-text.p-button-success:not(:disabled):active {
        background: dt('button.text.success.active.background');
        border-color: transparent;
        color: dt('button.text.success.color');
    }

    .p-button-text.p-button-info {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.info.color');
    }

    .p-button-text.p-button-info:not(:disabled):hover {
        background: dt('button.text.info.hover.background');
        border-color: transparent;
        color: dt('button.text.info.color');
    }

    .p-button-text.p-button-info:not(:disabled):active {
        background: dt('button.text.info.active.background');
        border-color: transparent;
        color: dt('button.text.info.color');
    }

    .p-button-text.p-button-warn {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.warn.color');
    }

    .p-button-text.p-button-warn:not(:disabled):hover {
        background: dt('button.text.warn.hover.background');
        border-color: transparent;
        color: dt('button.text.warn.color');
    }

    .p-button-text.p-button-warn:not(:disabled):active {
        background: dt('button.text.warn.active.background');
        border-color: transparent;
        color: dt('button.text.warn.color');
    }

    .p-button-text.p-button-help {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.help.color');
    }

    .p-button-text.p-button-help:not(:disabled):hover {
        background: dt('button.text.help.hover.background');
        border-color: transparent;
        color: dt('button.text.help.color');
    }

    .p-button-text.p-button-help:not(:disabled):active {
        background: dt('button.text.help.active.background');
        border-color: transparent;
        color: dt('button.text.help.color');
    }

    .p-button-text.p-button-danger {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.danger.color');
    }

    .p-button-text.p-button-danger:not(:disabled):hover {
        background: dt('button.text.danger.hover.background');
        border-color: transparent;
        color: dt('button.text.danger.color');
    }

    .p-button-text.p-button-danger:not(:disabled):active {
        background: dt('button.text.danger.active.background');
        border-color: transparent;
        color: dt('button.text.danger.color');
    }

    .p-button-text.p-button-contrast {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.contrast.color');
    }

    .p-button-text.p-button-contrast:not(:disabled):hover {
        background: dt('button.text.contrast.hover.background');
        border-color: transparent;
        color: dt('button.text.contrast.color');
    }

    .p-button-text.p-button-contrast:not(:disabled):active {
        background: dt('button.text.contrast.active.background');
        border-color: transparent;
        color: dt('button.text.contrast.color');
    }

    .p-button-text.p-button-plain {
        background: transparent;
        border-color: transparent;
        color: dt('button.text.plain.color');
    }

    .p-button-text.p-button-plain:not(:disabled):hover {
        background: dt('button.text.plain.hover.background');
        border-color: transparent;
        color: dt('button.text.plain.color');
    }

    .p-button-text.p-button-plain:not(:disabled):active {
        background: dt('button.text.plain.active.background');
        border-color: transparent;
        color: dt('button.text.plain.color');
    }

    .p-button-link {
        background: transparent;
        border-color: transparent;
        color: dt('button.link.color');
    }

    .p-button-link:not(:disabled):hover {
        background: transparent;
        border-color: transparent;
        color: dt('button.link.hover.color');
    }

    .p-button-link:not(:disabled):hover .p-button-label {
        text-decoration: underline;
    }

    .p-button-link:not(:disabled):active {
        background: transparent;
        border-color: transparent;
        color: dt('button.link.active.color');
    }
`;var wt=["content"],Bt=["loadingicon"],Pt=["icon"],Et=["*"],Tt=(t,i)=>({class:t,pt:i});function St(t,i){t&1&&Y(0)}function Dt(t,i){if(t&1&&C(0,"span",7),t&2){let n=s(3);h(n.cn(n.cx("loadingIcon"),"pi-spin",n.loadingIcon)),r("pBind",n.ptm("loadingIcon")),_("aria-hidden",!0)}}function Nt(t,i){if(t&1&&(K(),C(0,"svg",8)),t&2){let n=s(3);h(n.cn(n.cx("loadingIcon"),n.spinnerIconClass())),r("pBind",n.ptm("loadingIcon"))("spin",!0),_("aria-hidden",!0)}}function Ft(t,i){if(t&1&&(N(0),g(1,Dt,1,4,"span",3)(2,Nt,1,5,"svg",6),F()),t&2){let n=s(2);c(),r("ngIf",n.loadingIcon),c(),r("ngIf",!n.loadingIcon)}}function Mt(t,i){}function At(t,i){if(t&1&&g(0,Mt,0,0,"ng-template",9),t&2){let n=s(2);r("ngIf",n.loadingIconTemplate||n._loadingIconTemplate)}}function zt(t,i){if(t&1&&(N(0),g(1,Ft,3,2,"ng-container",2)(2,At,1,1,null,5),F()),t&2){let n=s();c(),r("ngIf",!n.loadingIconTemplate&&!n._loadingIconTemplate),c(),r("ngTemplateOutlet",n.loadingIconTemplate||n._loadingIconTemplate)("ngTemplateOutletContext",$(3,Tt,n.cx("loadingIcon"),n.ptm("loadingIcon")))}}function Ot(t,i){if(t&1&&C(0,"span",7),t&2){let n=s(2);h(n.cn("icon",n.iconClass())),r("pBind",n.ptm("icon"))}}function Lt(t,i){}function jt(t,i){if(t&1&&g(0,Lt,0,0,"ng-template",9),t&2){let n=s(2);r("ngIf",!n.icon&&(n.iconTemplate||n._iconTemplate))}}function Qt(t,i){if(t&1&&(N(0),g(1,Ot,1,3,"span",3)(2,jt,1,1,null,5),F()),t&2){let n=s();c(),r("ngIf",n.icon&&!n.iconTemplate&&!n._iconTemplate),c(),r("ngTemplateOutlet",n.iconTemplate||n._iconTemplate)("ngTemplateOutletContext",$(3,Tt,n.cx("icon"),n.ptm("icon")))}}function $t(t,i){if(t&1&&(L(0,"span",7),rt(1),j()),t&2){let n=s();h(n.cx("label")),r("pBind",n.ptm("label")),_("aria-hidden",n.icon&&!n.label),c(),it(n.label)}}function Vt(t,i){if(t&1&&C(0,"p-badge",10),t&2){let n=s();r("value",n.badge)("severity",n.badgeSeverity)("pt",n.ptm("pcBadge"))}}var Ht={root:({instance:t})=>["p-button p-component",{"p-button-icon-only":(t.icon||t.buttonProps?.icon||t.iconTemplate||t._iconTemplate||t.loadingIcon||t.loadingIconTemplate||t._loadingIconTemplate)&&!t.label&&!t.buttonProps?.label,"p-button-vertical":(t.iconPos==="top"||t.iconPos==="bottom")&&t.label,"p-button-loading":t.loading||t.buttonProps?.loading,"p-button-link":t.link||t.buttonProps?.link,[`p-button-${t.severity||t.buttonProps?.severity}`]:t.severity||t.buttonProps?.severity,"p-button-raised":t.raised||t.buttonProps?.raised,"p-button-rounded":t.rounded||t.buttonProps?.rounded,"p-button-text":t.text||t.variant==="text"||t.buttonProps?.text||t.buttonProps?.variant==="text","p-button-outlined":t.outlined||t.variant==="outlined"||t.buttonProps?.outlined||t.buttonProps?.variant==="outlined","p-button-sm":t.size==="small"||t.buttonProps?.size==="small","p-button-lg":t.size==="large"||t.buttonProps?.size==="large","p-button-plain":t.plain||t.buttonProps?.plain,"p-button-fluid":t.hasFluid}],loadingIcon:"p-button-loading-icon",icon:({instance:t})=>["p-button-icon",{[`p-button-icon-${t.iconPos||t.buttonProps?.iconPos}`]:t.label||t.buttonProps?.label,"p-button-icon-left":(t.iconPos==="left"||t.buttonProps?.iconPos==="left")&&t.label||t.buttonProps?.label,"p-button-icon-right":(t.iconPos==="right"||t.buttonProps?.iconPos==="right")&&t.label||t.buttonProps?.label},t.icon,t.buttonProps?.icon],spinnerIcon:({instance:t})=>Object.entries(t.iconClass()).filter(([,i])=>!!i).reduce((i,[n])=>i+` ${n}`,"p-button-loading-icon"),label:"p-button-label"},m=(()=>{class t extends bt{name="button";style=mt;classes=Ht;static \u0275fac=(()=>{let n;return function(o){return(n||(n=O(t)))(o||t)}})();static \u0275prov=Z({token:t,factory:t.\u0275fac})}return t})();var yt=new y("BUTTON_INSTANCE"),xt=new y("BUTTON_DIRECTIVE_INSTANCE"),kt=new y("BUTTON_LABEL_INSTANCE"),_t=new y("BUTTON_ICON_INSTANCE"),p={button:"p-button",component:"p-component",iconOnly:"p-button-icon-only",disabled:"p-disabled",loading:"p-button-loading",labelOnly:"p-button-loading-label-only"},Ct=(()=>{class t extends E{ptButtonLabel=f();$pcButtonLabel=a(kt,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=a(b,{self:!0});constructor(){super(),A(()=>{this.ptButtonLabel()&&this.directivePT.set(this.ptButtonLabel())})}onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}static \u0275fac=function(e){return new(e||t)};static \u0275dir=S({type:t,selectors:[["","pButtonLabel",""]],hostVars:2,hostBindings:function(e,o){e&2&&M("p-button-label",!0)},inputs:{ptButtonLabel:[1,"ptButtonLabel"]},features:[B([m,{provide:kt,useExisting:t},{provide:P,useExisting:t}]),k([b]),x]})}return t})(),It=(()=>{class t extends E{ptButtonIcon=f();$pcButtonIcon=a(_t,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=a(b,{self:!0});constructor(){super(),A(()=>{this.ptButtonIcon()&&this.directivePT.set(this.ptButtonIcon())})}onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}static \u0275fac=function(e){return new(e||t)};static \u0275dir=S({type:t,selectors:[["","pButtonIcon",""]],hostVars:2,hostBindings:function(e,o){e&2&&M("p-button-icon",!0)},inputs:{ptButtonIcon:[1,"ptButtonIcon"]},features:[B([m,{provide:_t,useExisting:t},{provide:P,useExisting:t}]),k([b]),x]})}return t})(),xn=(()=>{class t extends E{$pcButtonDirective=a(xt,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=a(b,{self:!0});_componentStyle=a(m);ptButtonDirective=f();hostName="";onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptm("root"))}constructor(){super(),A(()=>{this.ptButtonDirective()&&this.directivePT.set(this.ptButtonDirective())})}text=!1;plain=!1;raised=!1;size;outlined=!1;rounded=!1;iconPos="left";loadingIcon;fluid=f(void 0,{transform:d});iconSignal=H(It);labelSignal=H(Ct);isIconOnly=V(()=>!!(!this.labelSignal()&&this.iconSignal()));_label;_icon;_loading=!1;_severity;_buttonProps;initialized;get htmlElement(){return this.el.nativeElement}_internalClasses=Object.values(p);pcFluid=a(G,{optional:!0,host:!0,skipSelf:!0});isTextButton=V(()=>!!(!this.iconSignal()&&this.labelSignal()&&this.text));get label(){return this._label}set label(n){this._label=n,this.initialized&&(this.updateLabel(),this.updateIcon(),this.setStyleClass())}get icon(){return this._icon}set icon(n){this._icon=n,this.initialized&&(this.updateIcon(),this.setStyleClass())}get loading(){return this._loading}set loading(n){this._loading=n,this.initialized&&(this.updateIcon(),this.setStyleClass())}get buttonProps(){return this._buttonProps}set buttonProps(n){this._buttonProps=n,n&&typeof n=="object"&&Object.entries(n).forEach(([e,o])=>this[`_${e}`]!==o&&(this[`_${e}`]=o))}get severity(){return this._severity}set severity(n){this._severity=n,this.initialized&&this.setStyleClass()}spinnerIcon=`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon-spin">
        <g clip-path="url(#clip0_417_21408)">
            <path
                d="M6.99701 14C5.85441 13.999 4.72939 13.7186 3.72012 13.1832C2.71084 12.6478 1.84795 11.8737 1.20673 10.9284C0.565504 9.98305 0.165424 8.89526 0.041387 7.75989C-0.0826496 6.62453 0.073125 5.47607 0.495122 4.4147C0.917119 3.35333 1.59252 2.4113 2.46241 1.67077C3.33229 0.930247 4.37024 0.413729 5.4857 0.166275C6.60117 -0.0811796 7.76026 -0.0520535 8.86188 0.251112C9.9635 0.554278 10.9742 1.12227 11.8057 1.90555C11.915 2.01493 11.9764 2.16319 11.9764 2.31778C11.9764 2.47236 11.915 2.62062 11.8057 2.73C11.7521 2.78503 11.688 2.82877 11.6171 2.85864C11.5463 2.8885 11.4702 2.90389 11.3933 2.90389C11.3165 2.90389 11.2404 2.8885 11.1695 2.85864C11.0987 2.82877 11.0346 2.78503 10.9809 2.73C9.9998 1.81273 8.73246 1.26138 7.39226 1.16876C6.05206 1.07615 4.72086 1.44794 3.62279 2.22152C2.52471 2.99511 1.72683 4.12325 1.36345 5.41602C1.00008 6.70879 1.09342 8.08723 1.62775 9.31926C2.16209 10.5513 3.10478 11.5617 4.29713 12.1803C5.48947 12.7989 6.85865 12.988 8.17414 12.7157C9.48963 12.4435 10.6711 11.7264 11.5196 10.6854C12.3681 9.64432 12.8319 8.34282 12.8328 7C12.8328 6.84529 12.8943 6.69692 13.0038 6.58752C13.1132 6.47812 13.2616 6.41667 13.4164 6.41667C13.5712 6.41667 13.7196 6.47812 13.8291 6.58752C13.9385 6.69692 14 6.84529 14 7C14 8.85651 13.2622 10.637 11.9489 11.9497C10.6356 13.2625 8.85432 14 6.99701 14Z"
                fill="currentColor"
            />
        </g>
        <defs>
            <clipPath id="clip0_417_21408">
                <rect width="14" height="14" fill="white" />
            </clipPath>
        </defs>
    </svg>`;onAfterViewInit(){ct(this.htmlElement,this.getStyleClass().join(" ")),this.createIcon(),this.createLabel(),this.initialized=!0}getStyleClass(){let n=[p.button,p.component];return this.icon&&!this.label&&q(this.htmlElement.textContent)&&n.push(p.iconOnly),this.loading&&(n.push(p.disabled,p.loading),!this.icon&&this.label&&n.push(p.labelOnly),this.icon&&!this.label&&!q(this.htmlElement.textContent)&&n.push(p.iconOnly)),this.text&&n.push("p-button-text"),this.severity&&n.push(`p-button-${this.severity}`),this.plain&&n.push("p-button-plain"),this.raised&&n.push("p-button-raised"),this.size&&n.push(`p-button-${this.size}`),this.outlined&&n.push("p-button-outlined"),this.rounded&&n.push("p-button-rounded"),this.size==="small"&&n.push("p-button-sm"),this.size==="large"&&n.push("p-button-lg"),this.hasFluid&&n.push("p-button-fluid"),n}get hasFluid(){return this.fluid()??!!this.pcFluid}setStyleClass(){let n=this.getStyleClass();this.removeExistingSeverityClass(),this.htmlElement.classList.remove(...this._internalClasses),this.htmlElement.classList.add(...n)}removeExistingSeverityClass(){let n=["success","info","warn","danger","help","primary","secondary","contrast"],e=this.htmlElement.classList.value.split(" ").find(o=>n.some(l=>o===`p-button-${l}`));e&&this.htmlElement.classList.remove(e)}createLabel(){if(!v(this.htmlElement,".p-button-label")&&this.label){let e=U("span",{class:this.cx("label"),"p-bind":this.ptm("label"),"aria-hidden":this.icon&&!this.label?"true":null});e.appendChild(this.document.createTextNode(this.label)),this.htmlElement.appendChild(e)}}createIcon(){if(!v(this.htmlElement,".p-button-icon")&&(this.icon||this.loading)){let e=this.label?"p-button-icon-"+this.iconPos:null,o=this.getIconClass(),l=U("span",{class:this.cn(this.cx("icon"),e,o),"aria-hidden":"true","p-bind":this.ptm("icon")});!this.loadingIcon&&this.loading&&(l.innerHTML=this.spinnerIcon),this.htmlElement.insertBefore(l,this.htmlElement.firstChild)}}updateLabel(){let n=v(this.htmlElement,".p-button-label");if(!this.label){n&&this.htmlElement.removeChild(n);return}n?n.textContent=this.label:this.createLabel()}updateIcon(){let n=v(this.htmlElement,".p-button-icon"),e=v(this.htmlElement,".p-button-label");this.loading&&!this.loadingIcon&&n?n.innerHTML=this.spinnerIcon:n?.innerHTML&&(n.innerHTML=""),n?this.iconPos?n.className="p-button-icon "+(e?"p-button-icon-"+this.iconPos:"")+" "+this.getIconClass():n.className="p-button-icon "+this.getIconClass():this.createIcon()}getIconClass(){return this.loading?"p-button-loading-icon "+(this.loadingIcon?this.loadingIcon:"p-icon"):this.icon||"p-hidden"}onDestroy(){this.initialized=!1}static \u0275fac=function(e){return new(e||t)};static \u0275dir=S({type:t,selectors:[["","pButton",""]],contentQueries:function(e,o,l){e&1&&(Q(l,o.iconSignal,It,5),Q(l,o.labelSignal,Ct,5)),e&2&&et(2)},hostVars:4,hostBindings:function(e,o){e&2&&M("p-button-icon-only",o.isIconOnly())("p-button-text",o.isTextButton())},inputs:{ptButtonDirective:[1,"ptButtonDirective"],hostName:"hostName",text:[2,"text","text",d],plain:[2,"plain","plain",d],raised:[2,"raised","raised",d],size:"size",outlined:[2,"outlined","outlined",d],rounded:[2,"rounded","rounded",d],iconPos:"iconPos",loadingIcon:"loadingIcon",fluid:[1,"fluid"],label:"label",icon:"icon",loading:"loading",buttonProps:"buttonProps",severity:"severity"},features:[B([m,{provide:xt,useExisting:t},{provide:P,useExisting:t}]),k([b]),x]})}return t})(),Rt=(()=>{class t extends E{hostName="";$pcButton=a(yt,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=a(b,{self:!0});_componentStyle=a(m);onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptm("host"))}type="button";badge;disabled;raised=!1;rounded=!1;text=!1;plain=!1;outlined=!1;link=!1;tabindex;size;variant;style;styleClass;badgeClass;badgeSeverity="secondary";ariaLabel;autofocus;iconPos="left";icon;label;loading=!1;loadingIcon;severity;buttonProps;fluid=f(void 0,{transform:d});onClick=new D;onFocus=new D;onBlur=new D;contentTemplate;loadingIconTemplate;iconTemplate;templates;pcFluid=a(G,{optional:!0,host:!0,skipSelf:!0});get hasFluid(){return this.fluid()??!!this.pcFluid}_contentTemplate;_iconTemplate;_loadingIconTemplate;onAfterContentInit(){this.templates?.forEach(n=>{switch(n.getType()){case"content":this._contentTemplate=n.template;break;case"icon":this._iconTemplate=n.template;break;case"loadingicon":this._loadingIconTemplate=n.template;break;default:this._contentTemplate=n.template;break}})}spinnerIconClass(){return Object.entries(this.iconClass()).filter(([,n])=>!!n).reduce((n,[e])=>n+` ${e}`,"p-button-loading-icon")}iconClass(){return{[`p-button-loading-icon pi-spin ${this.loadingIcon??""}`]:this.loading,"p-button-icon":!0,[this.icon]:!0,"p-button-icon-left":this.iconPos==="left"&&this.label,"p-button-icon-right":this.iconPos==="right"&&this.label,"p-button-icon-top":this.iconPos==="top"&&this.label,"p-button-icon-bottom":this.iconPos==="bottom"&&this.label}}static \u0275fac=(()=>{let n;return function(o){return(n||(n=O(t)))(o||t)}})();static \u0275cmp=W({type:t,selectors:[["p-button"]],contentQueries:function(e,o,l){if(e&1&&(I(l,wt,5),I(l,Bt,5),I(l,Pt,5),I(l,st,4)),e&2){let u;T(u=w())&&(o.contentTemplate=u.first),T(u=w())&&(o.loadingIconTemplate=u.first),T(u=w())&&(o.iconTemplate=u.first),T(u=w())&&(o.templates=u)}},inputs:{hostName:"hostName",type:"type",badge:"badge",disabled:[2,"disabled","disabled",d],raised:[2,"raised","raised",d],rounded:[2,"rounded","rounded",d],text:[2,"text","text",d],plain:[2,"plain","plain",d],outlined:[2,"outlined","outlined",d],link:[2,"link","link",d],tabindex:[2,"tabindex","tabindex",dt],size:"size",variant:"variant",style:"style",styleClass:"styleClass",badgeClass:"badgeClass",badgeSeverity:"badgeSeverity",ariaLabel:"ariaLabel",autofocus:[2,"autofocus","autofocus",d],iconPos:"iconPos",icon:"icon",label:"label",loading:[2,"loading","loading",d],loadingIcon:"loadingIcon",severity:"severity",buttonProps:"buttonProps",fluid:[1,"fluid"]},outputs:{onClick:"onClick",onFocus:"onFocus",onBlur:"onBlur"},features:[B([m,{provide:yt,useExisting:t},{provide:P,useExisting:t}]),k([b]),x],ngContentSelectors:Et,decls:7,vars:14,consts:[["pRipple","",3,"click","focus","blur","ngStyle","disabled","pAutoFocus","pBind"],[4,"ngTemplateOutlet"],[4,"ngIf"],[3,"class","pBind",4,"ngIf"],[3,"value","severity","pt",4,"ngIf"],[4,"ngTemplateOutlet","ngTemplateOutletContext"],["data-p-icon","spinner",3,"class","pBind","spin",4,"ngIf"],[3,"pBind"],["data-p-icon","spinner",3,"pBind","spin"],[3,"ngIf"],[3,"value","severity","pt"]],template:function(e,o){e&1&&(nt(),L(0,"button",0),tt("click",function(u){return o.onClick.emit(u)})("focus",function(u){return o.onFocus.emit(u)})("blur",function(u){return o.onBlur.emit(u)}),ot(1),g(2,St,1,0,"ng-container",1)(3,zt,3,6,"ng-container",2)(4,Qt,3,6,"ng-container",2)(5,$t,2,5,"span",3)(6,Vt,1,3,"p-badge",4),j()),e&2&&(h(o.cn(o.cx("root"),o.styleClass,o.buttonProps==null?null:o.buttonProps.styleClass)),r("ngStyle",o.style||(o.buttonProps==null?null:o.buttonProps.style))("disabled",o.disabled||o.loading||(o.buttonProps==null?null:o.buttonProps.disabled))("pAutoFocus",o.autofocus||(o.buttonProps==null?null:o.buttonProps.autofocus))("pBind",o.ptm("root")),_("type",o.type||(o.buttonProps==null?null:o.buttonProps.type))("aria-label",o.ariaLabel||(o.buttonProps==null?null:o.buttonProps.ariaLabel))("tabindex",o.tabindex||(o.buttonProps==null?null:o.buttonProps.tabindex)),c(2),r("ngTemplateOutlet",o.contentTemplate||o._contentTemplate),c(),r("ngIf",o.loading),c(),r("ngIf",!o.loading),c(),r("ngIf",!o.contentTemplate&&!o._contentTemplate&&o.label),c(),r("ngIf",!o.contentTemplate&&!o._contentTemplate&&o.badge))},dependencies:[R,lt,at,ut,pt,gt,vt,ft,ht,z,b],encapsulation:2,changeDetection:0})}return t})(),kn=(()=>{class t{static \u0275fac=function(e){return new(e||t)};static \u0275mod=X({type:t});static \u0275inj=J({imports:[R,Rt,z,z]})}return t})();export{It as a,xn as b,Rt as c,kn as d};
