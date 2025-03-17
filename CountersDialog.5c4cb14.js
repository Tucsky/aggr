var t=Object.defineProperty,e=(e,s,n)=>(((e,s,n)=>{s in e?t(e,s,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[s]=n})(e,"symbol"!=typeof s?s+"":s,n),n);import{C as s,V as n,y as o,n as r,D as i}from"./index.5c4cb14.js";import{P as a}from"./paneDialogMixin.5c4cb14.js";var c=Object.defineProperty,l=Object.getOwnPropertyDescriptor;let p=class extends n{constructor(){super(...arguments),e(this,"paneId")}get countersCount(){return this.$store.state[this.paneId].count}get countersSteps(){return this.$store.state[this.paneId].steps}get liquidationsOnly(){return this.$store.state[this.paneId].liquidationsOnly}get countersStepsStringified(){const t=Date.now();return this.countersSteps.map((e=>o(t-e))).join(", ")}replaceCounters(t){const e=t.split(",").map((t=>(t=t.trim(),/[\d.]+s/.test(t)?1e3*parseFloat(t):/[\d.]+h/.test(t)?1e3*parseFloat(t)*60*60:1e3*parseFloat(t)*60))).filter((function(t,e,s){return s.indexOf(t)==e}));e.filter((t=>isNaN(t))).length?this.$store.dispatch("app/showNotice",{type:"error",title:`Counters (${t}) contains invalid steps.`}):this.$store.commit(this.paneId+"/REPLACE_COUNTERS",e)}};p=((t,e,s,n)=>{for(var o,r=n>1?void 0:n?l(e,s):e,i=t.length-1;i>=0;i--)(o=t[i])&&(r=(n?o(e,s,r):o(r))||r);return n&&r&&c(e,s,r),r})([s({name:"CountersSettings",props:{paneId:{type:String,required:!0}}})],p);const u=r({components:{CountersSettings:r(p,(function(){var t=this,e=t._self._c;return t._self._setupProxy,e("div",{staticClass:"settings-counters"},[e("div",{staticClass:"column"},[e("div",{staticClass:"form-group -tight"},[e("label",{directives:[{name:"tippy",rawName:"v-tippy",value:{placement:"bottom"},expression:"{ placement: 'bottom' }"}],staticClass:"checkbox-control checkbox-control-input -auto flex-right",attrs:{title:"Sum amount of trades instead of volume"}},[e("input",{staticClass:"form-control",attrs:{type:"checkbox"},domProps:{checked:t.countersCount},on:{change:function(e){return t.$store.commit(t.paneId+"/TOGGLE_COUNT",e.target.checked)}}}),e("div",{attrs:{on:"count",off:"volume"}})])]),e("div",{staticClass:"form-group -fill"},[e("input",{directives:[{name:"tippy",rawName:"v-tippy"}],staticClass:"form-control",attrs:{title:"Comma separated list of steps (ex: 1m, 5m, 10m, 15m)",type:"string",placeholder:"Enter a set of timeframes (ie 1m, 15m)"},domProps:{value:t.countersStepsStringified},on:{change:function(e){return t.replaceCounters(e.target.value)}}})])]),e("div",{staticClass:"form-group mt8"},[e("label",{staticClass:"checkbox-control -rip checkbox-control-input",on:{change:function(e){return t.$store.commit(t.paneId+"/TOGGLE_LIQUIDATIONS_ONLY",e.target.checked)}}},[e("input",{staticClass:"form-control",attrs:{type:"checkbox"},domProps:{checked:t.liquidationsOnly}}),e("div"),e("span",[t._v("Only count liquidations")])])])])}),[],!1,null,null,null,null).exports},mixins:[i,a]},(function(){var t=this,e=t._self._c;return e("Dialog",{staticClass:"pane-dialog",on:{clickOutside:t.close},scopedSlots:t._u([{key:"header",fn:function(){return[e("div",{staticClass:"dialog__title -editable",domProps:{textContent:t._s(t.name)},on:{dblclick:t.renamePane}}),e("div",{staticClass:"column -center"})]},proxy:!0}])},[e("counters-settings",{attrs:{paneId:t.paneId}})],1)}),[],!1,null,null,null,null).exports;export{u as default};
