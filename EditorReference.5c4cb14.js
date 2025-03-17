import{m as e}from"./marked.esm.5c4cb14.js";import{e as t}from"./editor.5c4cb142.js";import{n,u as o}from"./index.5c4cb14.js";import"./options.5c4cb14.js";const r=n({name:"EditorReference",props:{token:{type:String,required:!0},coordinates:{type:Object,required:!0},content:{type:String,required:!0}},data:()=>({dropdownTrigger:null,markupContent:""}),async mounted(){this.monacoInstances=[],this.dropdownTrigger=this.coordinates,this.markupContent=e(this.content),await this.$nextTick(),this.attachMonaco()},methods:{attachMonaco(){const e=this.$refs.markdown.querySelectorAll("code");for(const n of e){const e=n.innerText.replace(/\n$/,""),o=e.split("\n");e.length>64?(n.style.display="block",n.style.width="100%",n.style.minWidth="250px",n.style.height=18*o.length+"px",n.innerHTML="",this.monacoInstances.push(t.create(n,{value:e,language:"javascript",theme:"light"===this.$store.state.settings.theme?"vs-light":"my-dark",readOnly:!0,minimap:{enabled:!1},scrollbar:{alwaysConsumeMouseWheel:!1},automaticLayout:!1,wordBreak:"on",glyphMargin:!1,lineNumbers:"off",tabSize:2,contextmenu:!1,insertSpaces:!0,lineDecorationsWidth:4,renderLineHighlight:"none",scrollBeyondLastLine:!1,folding:!1,renderWhitespace:"none",overviewRulerBorder:!1,guides:{highlightActiveIndentation:!1,bracketPairsHorizontal:!1,indentation:!1}}))):n.classList.add("-filled")}},detachMonaco(){for(let e=0;e<this.monacoInstances.length;e++)this.monacoInstances[e].dispose(),this.monacoInstances.splice(e--,1)},beforeDestroy(){this.detachMonaco()},bindDragMove(e){if(2===e.button||this.dragging)return;document.addEventListener("mousemove",this.handleDragMove),document.addEventListener("mouseup",this.unbindDragMove),document.addEventListener("touchmove",this.handleDragMove),document.addEventListener("touchend",this.unbindDragMove);const{x:t,y:n}=o(e);this.dragging={x:t,y:n}},unbindDragMove(){this.dragging&&(document.removeEventListener("mousemove",this.handleDragMove),document.removeEventListener("mouseup",this.unbindDragMove),document.removeEventListener("touchmove",this.handleDragMove),document.removeEventListener("touchend",this.unbindDragMove),this.dragging=null)},handleDragMove(e){const{x:t,y:n}=o(e);this.$refs.dropdown.top+=n-this.dragging.y,this.$refs.dropdown.left+=t-this.dragging.x,this.dragging.x=t,this.dragging.y=n},onReferenceDropdownClose(){this.unbindDragMove(),this.detachMonaco()}}},(function(){var e=this,t=e._self._c;return t("dropdown",{ref:"dropdown",staticClass:"editor-reference__dropdown",attrs:{interactive:"",draggable:""},on:{closed:e.onReferenceDropdownClose},model:{value:e.dropdownTrigger,callback:function(t){e.dropdownTrigger=t},expression:"dropdownTrigger"}},[t("div",{staticClass:"editor-reference__header"},[t("div",{staticClass:"editor-reference__token",on:{mousedown:e.bindDragMove,touchstart:e.bindDragMove}},[e._v(" "+e._s(e.token)+" ")]),t("button",{staticClass:"editor-reference__close btn -text",on:{click:function(t){e.dropdownTrigger=null}}},[t("i",{staticClass:"icon-cross"})])]),t("div",{ref:"markdown",staticClass:"editor-reference__content",domProps:{innerHTML:e._s(e.markupContent)}})])}),[],!1,null,null,null,null).exports;export{r as default};
