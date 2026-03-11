import{Da as P,Ga as V,Ha as H,Ia as u,va as $,wa as T}from"./chunk-TM4TQEET.js";import{k as j,l as A,p as R,x as q}from"./chunk-5F2HRV3O.js";import{$b as m,Cb as r,Db as h,Eb as _,Fb as C,Gb as S,Hb as z,Ib as x,Ob as s,Rb as d,Ta as l,Tb as v,Ub as f,Xb as N,Z as M,_ as I,aa as E,ca as g,eb as w,fb as B,ib as F,jb as O,jc as D,kb as c,lc as y,va as k,yc as Q}from"./chunk-GWYGBRNZ.js";var L=`
    .p-timeline {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        direction: ltr;
    }

    .p-timeline-left .p-timeline-event-opposite {
        text-align: right;
    }

    .p-timeline-left .p-timeline-event-content {
        text-align: left;
    }

    .p-timeline-right .p-timeline-event {
        flex-direction: row-reverse;
    }

    .p-timeline-right .p-timeline-event-opposite {
        text-align: left;
    }

    .p-timeline-right .p-timeline-event-content {
        text-align: right;
    }

    .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(even) {
        flex-direction: row-reverse;
    }

    .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(odd) .p-timeline-event-opposite {
        text-align: right;
    }

    .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(odd) .p-timeline-event-content {
        text-align: left;
    }

    .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(even) .p-timeline-event-opposite {
        text-align: left;
    }

    .p-timeline-vertical.p-timeline-alternate .p-timeline-event:nth-child(even) .p-timeline-event-content {
        text-align: right;
    }

    .p-timeline-vertical .p-timeline-event-opposite,
    .p-timeline-vertical .p-timeline-event-content {
        padding: dt('timeline.vertical.event.content.padding');
    }

    .p-timeline-vertical .p-timeline-event-connector {
        width: dt('timeline.event.connector.size');
    }

    .p-timeline-event {
        display: flex;
        position: relative;
        min-height: dt('timeline.event.min.height');
    }

    .p-timeline-event:last-child {
        min-height: 0;
    }

    .p-timeline-event-opposite {
        flex: 1;
    }

    .p-timeline-event-content {
        flex: 1;
    }

    .p-timeline-event-separator {
        flex: 0;
        display: flex;
        align-items: center;
        flex-direction: column;
    }

    .p-timeline-event-marker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        align-self: baseline;
        border-width: dt('timeline.event.marker.border.width');
        border-style: solid;
        border-color: dt('timeline.event.marker.border.color');
        border-radius: dt('timeline.event.marker.border.radius');
        width: dt('timeline.event.marker.size');
        height: dt('timeline.event.marker.size');
        background: dt('timeline.event.marker.background');
    }

    .p-timeline-event-marker::before {
        content: ' ';
        border-radius: dt('timeline.event.marker.content.border.radius');
        width: dt('timeline.event.marker.content.size');
        height: dt('timeline.event.marker.content.size');
        background: dt('timeline.event.marker.content.background');
    }

    .p-timeline-event-marker::after {
        content: ' ';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: dt('timeline.event.marker.border.radius');
        box-shadow: dt('timeline.event.marker.content.inset.shadow');
    }

    .p-timeline-event-connector {
        flex-grow: 1;
        background: dt('timeline.event.connector.color');
    }

    .p-timeline-horizontal {
        flex-direction: row;
    }

    .p-timeline-horizontal .p-timeline-event {
        flex-direction: column;
        flex: 1;
    }

    .p-timeline-horizontal .p-timeline-event:last-child {
        flex: 0;
    }

    .p-timeline-horizontal .p-timeline-event-separator {
        flex-direction: row;
    }

    .p-timeline-horizontal .p-timeline-event-connector {
        width: 100%;
        height: dt('timeline.event.connector.size');
    }

    .p-timeline-horizontal .p-timeline-event-opposite,
    .p-timeline-horizontal .p-timeline-event-content {
        padding: dt('timeline.horizontal.event.content.padding');
    }

    .p-timeline-horizontal.p-timeline-alternate .p-timeline-event:nth-child(even) {
        flex-direction: column-reverse;
    }

    .p-timeline-bottom .p-timeline-event {
        flex-direction: column-reverse;
    }
`;var K=["content"],U=["opposite"],W=["marker"],b=e=>({$implicit:e});function X(e,a){e&1&&x(0)}function Y(e,a){e&1&&x(0)}function Z(e,a){if(e&1&&(S(0),c(1,Y,1,0,"ng-container",3),z()),e&2){let t=s().$implicit,i=s();l(),r("ngTemplateOutlet",i.markerTemplate||i._markerTemplate)("ngTemplateOutletContext",y(2,b,t))}}function ee(e,a){if(e&1&&C(0,"div",2),e&2){let t=s(2);m(t.cx("eventMarker")),r("pBind",t.ptm("eventMarker"))}}function te(e,a){if(e&1&&C(0,"div",2),e&2){let t=s(2);m(t.cx("eventConnector")),r("pBind",t.ptm("eventConnector"))}}function ne(e,a){e&1&&x(0)}function ie(e,a){if(e&1&&(h(0,"div",2)(1,"div",2),c(2,X,1,0,"ng-container",3),_(),h(3,"div",2),c(4,Z,2,4,"ng-container",4)(5,ee,1,3,"ng-template",null,0,Q)(7,te,1,3,"div",5),_(),h(8,"div",2),c(9,ne,1,0,"ng-container",3),_()()),e&2){let t=a.$implicit,i=a.last,o=N(6),n=s();m(n.cx("event")),r("pBind",n.ptm("event")),l(),m(n.cx("eventOpposite")),r("pBind",n.ptm("eventOpposite")),l(),r("ngTemplateOutlet",n.oppositeTemplate||n._oppositeTemplate)("ngTemplateOutletContext",y(19,b,t)),l(),m(n.cx("eventSeparator")),r("pBind",n.ptm("eventSeparator")),l(),r("ngIf",n.markerTemplate||n._markerTemplate)("ngIfElse",o),l(3),r("ngIf",!i),l(),m(n.cx("eventContent")),r("pBind",n.ptm("eventContent")),l(),r("ngTemplateOutlet",n.contentTemplate||n._contentTemplate)("ngTemplateOutletContext",y(21,b,t))}}var oe={root:({instance:e})=>["p-timeline p-component","p-timeline-"+e.align,"p-timeline-"+e.layout],event:"p-timeline-event",eventOpposite:"p-timeline-event-opposite",eventSeparator:"p-timeline-event-separator",eventMarker:"p-timeline-event-marker",eventConnector:"p-timeline-event-connector",eventContent:"p-timeline-event-content"},G=(()=>{class e extends P{name="timeline";style=L;classes=oe;static \u0275fac=(()=>{let t;return function(o){return(t||(t=k(e)))(o||e)}})();static \u0275prov=M({token:e,factory:e.\u0275fac})}return e})();var J=new E("TIMELINE_INSTANCE"),re=(()=>{class e extends H{bindDirectiveInstance=g(u,{self:!0});$pcTimeline=g(J,{optional:!0,skipSelf:!0})??void 0;onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}value;styleClass;align="left";layout="vertical";contentTemplate;oppositeTemplate;markerTemplate;templates;_contentTemplate;_oppositeTemplate;_markerTemplate;_componentStyle=g(G);getBlockableElement(){return this.el.nativeElement.children[0]}onAfterContentInit(){this.templates.forEach(t=>{switch(t.getType()){case"content":this._contentTemplate=t.template;break;case"opposite":this._oppositeTemplate=t.template;break;case"marker":this._markerTemplate=t.template;break}})}static \u0275fac=(()=>{let t;return function(o){return(t||(t=k(e)))(o||e)}})();static \u0275cmp=w({type:e,selectors:[["p-timeline"]],contentQueries:function(i,o,n){if(i&1&&(d(n,K,4),d(n,U,4),d(n,W,4),d(n,$,4)),i&2){let p;v(p=f())&&(o.contentTemplate=p.first),v(p=f())&&(o.oppositeTemplate=p.first),v(p=f())&&(o.markerTemplate=p.first),v(p=f())&&(o.templates=p)}},hostVars:2,hostBindings:function(i,o){i&2&&m(o.cn(o.cx("root"),o.styleClass))},inputs:{value:"value",styleClass:"styleClass",align:"align",layout:"layout"},features:[D([G,{provide:J,useExisting:e},{provide:V,useExisting:e}]),O([u]),F],decls:1,vars:1,consts:[["marker",""],[3,"pBind","class",4,"ngFor","ngForOf"],[3,"pBind"],[4,"ngTemplateOutlet","ngTemplateOutletContext"],[4,"ngIf","ngIfElse"],[3,"pBind","class",4,"ngIf"]],template:function(i,o){i&1&&c(0,ie,10,23,"div",1),i&2&&r("ngForOf",o.value)},dependencies:[q,j,A,R,T,u],encapsulation:2,changeDetection:0})}return e})(),Me=(()=>{class e{static \u0275fac=function(i){return new(i||e)};static \u0275mod=B({type:e});static \u0275inj=I({imports:[re,T,T]})}return e})();export{re as a,Me as b};
