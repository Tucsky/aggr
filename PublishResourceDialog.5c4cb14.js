import{n as t,h as s,L as i,B as e,D as a}from"./index.5c4cb14.js";import{u as r}from"./IndicatorLibraryDialog.5c4cb14.js";import"./marked.esm.5c4cb14.js";import"./Tab.5c4cb14.js";const o=t({name:"PublishResourceDialog",components:{TransitionHeight:s,Loader:i,Btn:e},props:{item:{type:Object,required:!0}},mixins:[a],data:()=>({dialogOpened:!1,isLoading:!1,errorMessage:null,output:null,repoUrl:"https://github.com/Tucsky/aggr-lib"}),computed:{prId(){return this.output?this.output.split("/").pop():""}},mounted(){this.show()},methods:{show(){this.dialogOpened=!0},hide(){this.isLoading||(this.dialogOpened=!1)},onHide(){this.close()},async submit(){if(!this.isLoading){this.errorMessage=null,this.isLoading=!0;try{const t=await r(this.item);this.output=t}catch(t){this.errorMessage=t.message}finally{this.isLoading=!1}}}}},(function(){var t=this,s=t._self._c;return s("form",{on:{submit:function(s){return s.preventDefault(),t.submit.apply(null,arguments)}}},[s("transition",{attrs:{name:"dialog",duration:500},on:{"after-leave":t.onHide}},[t.dialogOpened?s("Dialog",{staticClass:"publish-resource",attrs:{borderless:""},on:{clickOutside:t.hide},scopedSlots:t._u([{key:"header",fn:function(){return[s("div",{staticClass:"dialog__title"},[t._v(" Publish: "),s("code",[t._v(t._s(t.item.name))])])]},proxy:!0}],null,!1,320783052)},[s("transition-height",{attrs:{single:"",name:"transition-height-scale"}},[t.errorMessage?s("div",[s("div",{staticClass:"publish-resource__error"},[s("p",{staticClass:"mx0"},[s("i",{staticClass:"icon-warning mr8"}),t._v(" "+t._s(t.errorMessage)+" ")])])]):t._e()]),s("transition-height",{staticClass:"publish-resource__wrapper",attrs:{stepper:"",name:"slide-fade-right",duration:500,"fill-height":""}},[t.isLoading?s("div",{key:"loading",staticClass:"publish-resource__loading"},[s("loader",{staticClass:"mx0 -center"}),s("p",{staticClass:"mb0 mt0 ml16 text-color-50 -center"},[t._v(" Please wait a moment... ")])],1):t.output?s("div",{key:"completed",staticClass:"publish-resource__confirm"},[s("h3",{staticClass:"mx0"},[t._v("Thank you "+t._s(t.item.author)+" !")]),s("p",{staticClass:"mb0"},[t._v(" You can follow the review process on the "),s("i",{staticClass:"icon-github mr8"}),s("a",{attrs:{href:t.output,target:"_blank"}},[t._v("Github pull request")])]),s("Btn",{staticClass:"mt16 -theme -large mlauto mtauto",attrs:{href:t.output,target:"_blank"}},[t._v(" Open "),s("i",{staticClass:"icon-external-link-square-alt ml8"})])],1):s("div",{key:"onboarding",staticClass:"publish-resource__actions divider-container"},[s("Btn",{directives:[{name:"tippy",rawName:"v-tippy"}],staticClass:"-large -green -cases",attrs:{type:"submit",title:"Automatic contribution"}},[s("i",{staticClass:"icon-upload mr8"}),t._v(" Upload now ")]),s("div",{staticClass:"divider divider--vertical"},[t._v("Or")]),s("Btn",{directives:[{name:"tippy",rawName:"v-tippy",value:{placement:"bottom"},expression:"{ placement: 'bottom' }"}],staticClass:"-text -cases",attrs:{href:t.repoUrl,target:"_blank",title:"Manual contribution"}},[s("i",{staticClass:"icon-github mr8"}),t._v(" Contribute on Github ")])],1)])],1):t._e()],1)],1)}),[],!1,null,"2afc8d53",null,null).exports;export{o as default};