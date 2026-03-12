import{a as M,b as w}from"./chunk-6YFMRGDV.js";import"./chunk-2JBPLALQ.js";import"./chunk-25UMUH2U.js";import"./chunk-KZF5WFWZ.js";import"./chunk-YRBMHT2C.js";import"./chunk-4CUEVHDJ.js";import"./chunk-VMGZ7D22.js";import"./chunk-B3IDDFDW.js";import"./chunk-GGQ7LRWG.js";import"./chunk-TBYF2LDC.js";import"./chunk-BODZH67C.js";import{c as _,d as I}from"./chunk-N6ZHY2QP.js";import"./chunk-ID624Q2Y.js";import"./chunk-2WOYJ5Q5.js";import"./chunk-3IN5ZC4Q.js";import{Da as D,Ha as B}from"./chunk-CCVU2434.js";import{x as E}from"./chunk-4FGG4OVW.js";import{Cb as a,Db as e,Eb as t,Fb as r,Nb as u,Pb as h,Qb as x,Ta as l,Z as v,_ as y,ac as o,ca as f,eb as b,fb as g,ib as S,jc as k,va as c}from"./chunk-QQDNL2ZL.js";import"./chunk-GAL4ENT6.js";var C=`
    .p-buttongroup {
        display: inline-flex;
    }

    .p-buttongroup .p-button {
        margin: 0;
    }

    .p-buttongroup .p-button:not(:last-child),
    .p-buttongroup .p-button:not(:last-child):hover {
        border-inline-end: 0 none;
    }

    .p-buttongroup .p-button:not(:first-of-type):not(:last-of-type) {
        border-radius: 0;
    }

    .p-buttongroup .p-button:first-of-type:not(:only-of-type) {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
    }

    .p-buttongroup .p-button:last-of-type:not(:only-of-type) {
        border-start-start-radius: 0;
        border-end-start-radius: 0;
    }

    .p-buttongroup .p-button:focus {
        position: relative;
        z-index: 1;
    }
`;var j=["*"],N=`
    ${C}

    /* For PrimeNG */
    .p-buttongroup p-button:focus .p-button {
        position: relative;
        z-index: 1;
    }

    .p-buttongroup p-button:not(:last-child) .p-button,
    .p-buttongroup p-button:not(:last-child) .p-button:hover {
        border-right: 0 none;
    }

    .p-buttongroup p-button:not(:first-of-type):not(:last-of-type) .p-button {
        border-radius: 0;
    }

    .p-buttongroup p-button:first-of-type:not(:only-of-type) .p-button {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
    }

    .p-buttongroup p-button:last-of-type:not(:only-of-type) .p-button {
        border-start-start-radius: 0;
        border-end-start-radius: 0;
    }
`,H={root:"p-buttongroup p-component"},P=(()=>{class i extends D{name="buttongroup";style=N;classes=H;static \u0275fac=(()=>{let p;return function(d){return(p||(p=c(i)))(d||i)}})();static \u0275prov=v({token:i,factory:i.\u0275fac})}return i})();var m=(()=>{class i extends B{_componentStyle=f(P);static \u0275fac=(()=>{let p;return function(d){return(p||(p=c(i)))(d||i)}})();static \u0275cmp=b({type:i,selectors:[["p-buttonGroup"],["p-buttongroup"],["p-button-group"]],features:[k([P]),S],ngContentSelectors:j,decls:2,vars:0,consts:[["role","group",1,"p-buttongroup","p-component"]],template:function(n,d){n&1&&(h(),e(0,"span",0),x(1),t())},dependencies:[E],encapsulation:2,changeDetection:0})}return i})(),F=(()=>{class i{static \u0275fac=function(n){return new(n||i)};static \u0275mod=g({type:i});static \u0275inj=y({imports:[m]})}return i})();var T=class i{items=[];loading=[!1,!1,!1,!1];ngOnInit(){this.items=[{label:"Update",icon:"pi pi-refresh"},{label:"Delete",icon:"pi pi-times"},{label:"Angular.io",icon:"pi pi-info",url:"http://angular.io"},{separator:!0},{label:"Setup",icon:"pi pi-cog"}]}load(s){this.loading[s]=!0,setTimeout(()=>this.loading[s]=!1,1e3)}static \u0275fac=function(p){return new(p||i)};static \u0275cmp=b({type:i,selectors:[["app-button-demo"]],decls:148,vars:13,consts:[[1,"flex","flex-col","md:flex-row","gap-8"],[1,"md:w-1/2"],[1,"card","flex","flex-col","gap-4"],[1,"font-semibold","text-xl"],[1,"flex","flex-wrap","gap-2"],["label","Submit"],["label","Disabled",3,"disabled"],["label","Link",1,"p-button-link"],["label","Primary"],["label","Secondary","severity","secondary"],["label","Success","severity","success"],["label","Info","severity","info"],["label","Warn","severity","warn"],["label","Help","severity","help"],["label","Danger","severity","danger"],["label","Contrast","severity","contrast"],["label","Primary","text",""],["label","Secondary","severity","secondary","text",""],["label","Success","severity","success","text",""],["label","Info","severity","info","text",""],["label","Warn","severity","warn","text",""],["label","Help","severity","help","text",""],["label","Danger","severity","danger","text",""],["label","Plain","text",""],["label","Primary","outlined",""],["label","Secondary","severity","secondary","outlined",""],["label","Success","severity","success","outlined",""],["label","Info","severity","info","outlined",""],["label","Warn","severity","warn","outlined",""],["label","Help","severity","help","outlined",""],["label","Danger","severity","danger","outlined",""],["label","Contrast","severity","contrast","outlined",""],["label","Save","icon","pi pi-check"],["label","Delete","icon","pi pi-trash"],["label","Cancel","icon","pi pi-times"],["label","Save",3,"model"],["label","Save","severity","secondary",3,"model"],["label","Save","severity","success",3,"model"],["label","Save","severity","info",3,"model"],["label","Save","severity","warn",3,"model"],["label","Save","severity","help",3,"model"],["label","Save","severity","danger",3,"model"],["label","Save","severity","contrast",3,"model"],["type","button"],["alt","logo","src","https://primefaces.org/cdn/primeng/images/logo.svg",2,"width","1.5rem"],["type","button","outlined","","severity","success"],[1,"text-bold"],["icon","pi pi-star-fill"],["label","Bookmark","icon","pi pi-bookmark"],["label","Bookmark","icon","pi pi-bookmark","iconPos","right"],["label","Primary","raised",""],["label","Secondary","severity","secondary","raised",""],["label","Success","severity","success","raised",""],["label","Info","severity","info","raised",""],["label","Warn","severity","warn","raised",""],["label","Help","severity","help","raised",""],["label","Danger","severity","danger","raised",""],["label","Contrast","severity","contrast","raised",""],["label","Primary","rounded",""],["label","Secondary","severity","secondary","rounded",""],["label","Success","severity","success","rounded",""],["label","Info","severity","info","rounded",""],["label","Warn","severity","warn","rounded",""],["label","Help","severity","help","rounded",""],["label","Danger","severity","danger","rounded",""],["label","Contrast","severity","contrast","rounded",""],["icon","pi pi-check","rounded",""],["icon","pi pi-bookmark","severity","secondary","rounded",""],["icon","pi pi-search","severity","success","rounded",""],["icon","pi pi-user","severity","info","rounded",""],["icon","pi pi-bell","severity","warn","rounded",""],["icon","pi pi-heart","severity","help","rounded",""],["icon","pi pi-times","severity","danger","rounded",""],["icon","pi pi-check","text","","raised","","rounded",""],["icon","pi pi-bookmark","severity","secondary","text","","raised","","rounded",""],["icon","pi pi-search","severity","success","text","","raised","","rounded",""],["icon","pi pi-user","severity","info","text","","raised","","rounded",""],["icon","pi pi-bell","severity","warn","text","","raised","","rounded",""],["icon","pi pi-heart","severity","help","text","","raised","","rounded",""],["icon","pi pi-times","severity","danger","text","","raised","","rounded",""],["icon","pi pi-check","rounded","","outlined",""],["icon","pi pi-bookmark","severity","secondary","rounded","","outlined",""],["icon","pi pi-search","severity","success","rounded","","outlined",""],["icon","pi pi-user","severity","info","rounded","","outlined",""],["icon","pi pi-bell","severity","warn","rounded","","outlined",""],["icon","pi pi-heart","severity","help","rounded","","outlined",""],["icon","pi pi-times","severity","danger","rounded","","outlined",""],["type","button","label","Search","icon","pi pi-search",3,"click","loading"],["type","button","label","Search","icon","pi pi-search","iconPos","right",3,"click","loading"],["type","button","styleClass","h-full","icon","pi pi-search",3,"click","loading"],["type","button","label","Search",3,"click","loading"]],template:function(p,n){p&1&&(e(0,"div",0)(1,"div",1)(2,"div",2)(3,"div",3),o(4,"Default"),t(),e(5,"div",4),r(6,"p-button",5)(7,"p-button",6)(8,"p-button",7),t()(),e(9,"div",2)(10,"div",3),o(11,"Severities"),t(),e(12,"div",4),r(13,"p-button",8)(14,"p-button",9)(15,"p-button",10)(16,"p-button",11)(17,"p-button",12)(18,"p-button",13)(19,"p-button",14)(20,"p-button",15),t()(),e(21,"div",2)(22,"div",3),o(23,"Text"),t(),e(24,"div",4),r(25,"p-button",16)(26,"p-button",17)(27,"p-button",18)(28,"p-button",19)(29,"p-button",20)(30,"p-button",21)(31,"p-button",22)(32,"p-button",23),t()(),e(33,"div",2)(34,"div",3),o(35,"Outlined"),t(),e(36,"div",4),r(37,"p-button",24)(38,"p-button",25)(39,"p-button",26)(40,"p-button",27)(41,"p-button",28)(42,"p-button",29)(43,"p-button",30)(44,"p-button",31),t()(),e(45,"div",2)(46,"div",3),o(47,"Group"),t(),e(48,"div",4)(49,"p-buttongroup"),r(50,"p-button",32)(51,"p-button",33)(52,"p-button",34),t()()(),e(53,"div",2)(54,"div",3),o(55,"SplitButton"),t(),e(56,"div",4),r(57,"p-splitbutton",35)(58,"p-splitbutton",36)(59,"p-splitbutton",37)(60,"p-splitbutton",38)(61,"p-splitbutton",39)(62,"p-splitbutton",40)(63,"p-splitbutton",41)(64,"p-splitbutton",42),t()(),e(65,"div",2)(66,"div",3),o(67,"Templating"),t(),e(68,"div",4)(69,"p-button",43),r(70,"img",44),t(),e(71,"p-button",45),r(72,"img",44),e(73,"span",46),o(74,"PrimeNG"),t()()()()(),e(75,"div",1)(76,"div",2)(77,"div",3),o(78,"Icons"),t(),e(79,"div",4),r(80,"p-button",47)(81,"p-button",48)(82,"p-button",49),t()(),e(83,"div",2)(84,"div",3),o(85,"Raised"),t(),e(86,"div",4),r(87,"p-button",50)(88,"p-button",51)(89,"p-button",52)(90,"p-button",53)(91,"p-button",54)(92,"p-button",55)(93,"p-button",56)(94,"p-button",57),t()(),e(95,"div",2)(96,"div",3),o(97,"Rounded"),t(),e(98,"div",4),r(99,"p-button",58)(100,"p-button",59)(101,"p-button",60)(102,"p-button",61)(103,"p-button",62)(104,"p-button",63)(105,"p-button",64)(106,"p-button",65),t()(),e(107,"div",2)(108,"div",3),o(109,"Rounded Icons"),t(),e(110,"div",4),r(111,"p-button",66)(112,"p-button",67)(113,"p-button",68)(114,"p-button",69)(115,"p-button",70)(116,"p-button",71)(117,"p-button",72),t()(),e(118,"div",2)(119,"div",3),o(120,"Rounded Text"),t(),e(121,"div",4),r(122,"p-button",73)(123,"p-button",74)(124,"p-button",75)(125,"p-button",76)(126,"p-button",77)(127,"p-button",78)(128,"p-button",79),t()(),e(129,"div",2)(130,"div",3),o(131,"Rounded Outlined"),t(),e(132,"div",4),r(133,"p-button",80)(134,"p-button",81)(135,"p-button",82)(136,"p-button",83)(137,"p-button",84)(138,"p-button",85)(139,"p-button",86),t()(),e(140,"div",2)(141,"div",3),o(142,"Loading"),t(),e(143,"div",4)(144,"p-button",87),u("click",function(){return n.load(0)}),t(),e(145,"p-button",88),u("click",function(){return n.load(1)}),t(),e(146,"p-button",89),u("click",function(){return n.load(2)}),t(),e(147,"p-button",90),u("click",function(){return n.load(3)}),t()()()()()),p&2&&(l(7),a("disabled",!0),l(50),a("model",n.items),l(),a("model",n.items),l(),a("model",n.items),l(),a("model",n.items),l(),a("model",n.items),l(),a("model",n.items),l(),a("model",n.items),l(),a("model",n.items),l(80),a("loading",n.loading[0]),l(),a("loading",n.loading[1]),l(),a("loading",n.loading[2]),l(),a("loading",n.loading[3]))},dependencies:[I,_,F,m,w,M],encapsulation:2})};export{T as ButtonDemo};
