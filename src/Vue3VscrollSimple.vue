<!-- Vue3VscrollSimple component -->

<template>
  <Vue3Vscroll
    :list="list"
    :default-height="defaultHeight"
    :header-height="headerHeight"
    :footer-height="footerHeight"
    :viewport-height="viewportHeight"
    :redraw-signal="redrawSignal"
    :padding="padding"
    :hysteresis="hysteresis"
    :height-attr-name="heightAttrName"
    :redraw-wait="redrawWait"
    @update-height="updateHeight"
    v-slot="slot">
    <div ref="header" @mousemove="onHeaderMousemove">
      <slot name="header"></slot>
    </div>
    <div v-for="row, index of slot.vlist" :key="row[keyAttrName]" :id="row[keyAttrName]+uid" @mousemove="onMousemove(row)">
      <slot :row="row" :index="index" :vlist="slot.vlist"></slot>
    </div>
    <div ref="footer" @mousemove="onFooterMousemove">
      <slot name="footer"></slot>
    </div>
  </Vue3Vscroll>
</template>

<script setup>
import Vue3Vscroll from './Vue3Vscroll.vue'
import { ref, onMounted } from 'vue'

/** debug mode */
const debug = false;
/** unique id */
const uid = '_' + Math.floor(Math.random()*1e16)
/** redraw request */
const redrawSignal = ref(0);
/** reference to the header element */
const header = ref(null);
/** reference to the footer element */
const footer = ref(null);
/** height of header */
const headerHeight = ref(0);
/** height of footer */
const footerHeight = ref(0);

const props = defineProps({
  /** 
   * The big array data for virtual scroll. 
   * Each element of the array corresponds to the row of the big table.
   */
  list: { type: Array, required: true },
  /**
   * Default height of each row in the table.
   * This is used to estimate the height of rows 
   * which are not yet actually displayed.
   * Average of the height should be supplied.
   */
  defaultHeight: { type: Number, required: true },
  /**
   * The height of the viewport. If omitted, summation of all the height of list rows
   * are used.
   */
  viewportHeight: { type: Number, default: null },
  /**
   * Additional size of the screen extended from the height of the visible area.
   * If omitted, it will be the smaller one of browser screen height or viewport
   * height multipled by 0.5.
   */
  padding: { type: Number, default: null },
  /**
   * Hysteresis ratio to the padding value. It is the threshold of scroll
   * when the virtual table will be updated in accordance with the change
   * of visible area of the table. For example, if hysteresis=0.5, scrolling
   * half of padding value causes vlist to be recreated and then the visible
   * portion of list will be redisplayed.
   * It must be in range [0, 1.0]. Default is 0.5.
   */
  hysteresis: { type: Number, default: 0.5 },
  /**
   * Attribute name of each element of list that holds height of the element.
   * list[ri][heightAttrName] should be the height of ri-th element of list.
   */
  heightAttrName: { type: String, default: 'height' },
  /**
   * Attribute name of each element of list that identifies the element.
   * list[ri][keyAttrName] should be the identifier of ri-th element of list.
   */
  keyAttrName: { type: String, default: 'id' },
  /** debounce time to actually call redraw */
  redrawWait: { type: Number, default: 20 },
})

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  }
}
const updateRow = (row) => {
  const id = row[props.keyAttrName] + uid;
  const el = document.getElementById(id);
  if(!el) return;
  const newHeight = el.getBoundingClientRect().height;
  if(row[props.heightAttrName] == newHeight) return;
  row[props.heightAttrName] = newHeight;
  ++redrawSignal.value;
}
const updateHeight = (from, to) => {
  for(let rowIdx=from; rowIdx<to; ++rowIdx) {
    updateRow(props.list[rowIdx]);
  }
}
const onMousemove = debounce(updateRow, props.redrawWait);
const updateHeaderHeight = () => headerHeight.value = header.value?.getBoundingClientRect().height ?? 0;
const onHeaderMousemove = debounce(updateHeaderHeight, props.redrawWait);
const updateFooterHeight = () => footerHeight.value = footer.value?.getBoundingClientRect().height ?? 0;
const onFooterMousemove = debounce(updateFooterHeight, props.redrawWait);
onMounted(() => {
  updateHeaderHeight();
  updateFooterHeight();
})

</script>
