<!-- Vue3Vscroll component -->

<template>
  <div ref="viewport" @scroll="onRedraw" :style="{ height: viewportHeight2 + 'px', overflow: 'auto' }">
    <div :style="{ height: screenHeight + 'px', overflow: 'hidden', position: 'relative' }">
      <div :style="sheetStyle">
        <slot :vlist="vlist"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, toRefs, watch, computed, onMounted, nextTick } from 'vue'

/** debug mode */
const debug = true;
/** used to determine the default value of padding. A ratio to the visible portion. */
const defaultPaddingRatio = 0.5;
/** sliced portion of list which is visible on the screen */
const vlist = ref([]);
/** css style to translate the sheet posision on the viewport */
const sheetStyle = ref({});
/** the first index of the visible portion of list */
const startIdx = ref(0);
/** the last index+1 of the visible portion of list */
const endIdx = ref(0);
/** top location of startIdx on the viewport except for the header */
const startTop = ref(0);
/** top location of endIdx on the viewport except for the header */
const endTop = ref(0);
/** height of the viewport */
const viewportHeight2 = ref(0);
/** height of the screen */
const screenHeight = ref(0);
/** reference to the viewport element */
const viewport = ref(null);

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
  /** The height of the header */
  headerHeight: { type: Number, default: 0 },
  /** The height of the footer */
  footerHeight: { type: Number, default: 0 },
  /**
   * The height of the viewport. If omitted, summation of all the height of list rows
   * are used.
   */
  viewportHeight: { type: Number, default: null },
  /** 
   * This property is watched for change and redraw() function is called
   * whenever any change is detected. The value of this property is not used.
   * list property is also watched but deep option of watcher API
   * is not used. So, changing deep element of list cannot be detected.
   */
  redrawSignal: {},
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
   * If true, event listener is registered on the global window
   * so that virtual table is redrawed whenever whole browser screen
   * is scrolled or resized as follows.
   * window.addEventListener('scroll', onRedraw);
   * window.addEventListener('resize', onRedraw);
   * Default is true.
   */
  addWindowEvent: { type: Boolean, default: true },
  /** debounce time to actually call redraw */
  redrawWait: { type: Number, default: 20 },
})
const { list, defaultHeight, headerHeight, footerHeight, viewportHeight, 
  redrawSignal, padding, hysteresis, } = toRefs(props);

const emit = defineEmits([
  /**
   * Request to update height attribute of list elements.
   * It is called in the form of:
   * updateHeight(startIdx, endIdx)
   * where startIdx and endIdx is the visible portion of list.
   * list[rowIdx].height should be updated for all of
   * rowIdx = startIdx, startIdx+1, ..., endIdx-1
   * This event is called after vlist is updated and rendered.
   * vlist is calculated by this component as:
   * vlist = list.slice(startIdx, endIdx)
   */
  'updateHeight'
])

/**
 * The cache of the height of each row and summation of heights.
 * For all ri = 0..(list.length-1)
 * rowInfo(ri*2) = h(ri) = height of list[ri]
 * rowInfo(ri*2+1) = sum(ri)
 * where sum(ri) is the summation of last s rows up to ri:
 * sum(ri) = h(ri-s+1) + h(ri-s+2) + ... + h(ri)
 * where s is:
 * s = ((ri xor ri+1) + 1) / 2
 * For example, if ri is even then s=1, if ri=2^n-1 then s=2^n.
 */
const rowInfo = ref([]);
/** list.length */
const listLength = ref(0);
/** the biggest power of two which is less than or equal to listLength */
const bpt = computed(() => Math.pow(2, Math.floor(Math.log2(listLength.value))));
/** Debouncing function by Underscore.js */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  }
}

/** check consistency of rowInfo */
const checkRowInfo = () => {
  console.log("Vue3Vscroll.checkRowInfo");
  const info = rowInfo.value;
  const len = listLength.value;
  if(info.length != len*2) {
    console.error("Vue3Vscroll.checkRowInfo: rowInfo length mismatch.");
  }
  const chk = Array(len);
  for(let ri=0; ri<len; ++ri) {
    chk[ri] = info[ri*2];
  }
  let bit = 1;
  while(bit*2 <= len) {
    for(let i=bit*2-1; i<len; i += bit*2) {
      chk[i] += chk[i - bit];
    }
    bit *= 2;
  }
  for(let ri=0; ri<len; ++ri) {
    if(chk[ri] != info[ri*2+1]) {
      console.error(`Vue3Vscroll.checkRowInfo: rowInfo[${ri}*3+2=${ri*3+2}] mismatched`);
    }
  }
}
/** update rowInfo so that h(rowIdx) = newHeight */
const update1 = (rowIdx) => {
  const newHeight = list.value[rowIdx]?.[props.heightAttrName] ?? defaultHeight.value;
  const info = rowInfo.value;
  const len = listLength.value;
  let bit = 1;
  let ri = rowIdx;
  const diff = newHeight - info[ri*2];
  if(diff == 0) return;
  info[ri*2] += diff;
  info[ri*2+1] += diff;
  while(bit < len) {
    if((ri & bit) == 0) {
      ri += bit;
      if(ri >= len) return;
      info[ri*2+1] += diff;
    }
    bit *= 2;
  }
}
/** update rowInfo accessing list[ri].height value in range ri=[from, to) */
const updateRange = (from, to) => {
  if(to > listLength.value) to = listLength.value;
  for(let ri=from; ri<to; ++ri) update1(ri);
}
/** special version of updateRange, used only when the initialization. */
const updateAll = () => {
  const len = list.value.length;
  const info = rowInfo.value = Array(len * 2);
  const dh = defaultHeight.value;
  listLength.value = len;
  for(let ri=0; ri<len; ++ri) {
    const s = ((ri ^ ri+1) + 1) / 2;
    info[ri*2] = dh;
    info[ri*2+1] = dh * s;
  }
}
/** update rowInfo according to the current value of list */
const update = () => {
  const len = list.value.length;
  const oldLen = listLength.value;
  if(oldLen == 0) {
    updateAll();
  } else if(len < oldLen) {
    rowInfo.value.splice(len*2);
    listLength.value = len;
  } else if(len > oldLen) {
    rowInfo.value = rowInfo.value.concat(Array((len - oldLen) * 2).fill(0));
    listLength.value = len;
    updateRange(oldLen, len);
  }
  updateRange(startIdx.value, endIdx.value);
}
/** calculate h(0)+h(1)+...+h(ri-1) */
const getRowTop = (rowIdx) => {
  const info = rowInfo.value;
  const upto = Math.min(rowIdx, listLength.value);
  let bit = 1;
  let sum = 0;
  let ri = rowIdx;
  while(bit <= upto) {
    if(ri & bit) {
      sum += info[ri * 2 - 1];
      ri -= bit;
    }
    bit *= 2;
  }
  return sum;
}
/** find ri where getRowTop(ri) <= rowTop < getRowTop(ri+1) */
const getRowIdx = (rowTop) => {
  if(rowTop < 0) return -1;
  const info = rowInfo.value;
  let rest = rowTop;
  let bit = bpt.value;
  let ri = 0;
  while(bit >= 1) {
    const h = info[(ri + bit) * 2 - 1];
    if(rest >= h) {
      ri += bit;
      rest -= h;
    }
    bit /= 2;
  }
  return ri;
}
/** calculate h(0)+h(1)+...+h(list.length-1) */
const getTotalRowHeight = () => {
  return getRowTop(listLength.value);
}
/** get first index of the visible portion of list */
const getStartIdx = (topOffset, padding2) => {
  const paddedTop1 = topOffset - (padding2 * (1 + hysteresis.value));
  const paddedTop2 = topOffset - (padding2 * (1 - hysteresis.value));
  if(startTop.value < paddedTop1 || startTop.value > paddedTop2) {
    return Math.max(0, getRowIdx(topOffset - padding2));
  } else {
    return startIdx.value;
  }
}
/** get last index+1 of the visible portion of list */
const getEndIdx = (bottomOffset, padding2) => {
  const paddedBottom1 = bottomOffset + (padding2 * (1 - hysteresis.value));
  const paddedBottom2 = bottomOffset + (padding2 * (1 + hysteresis.value));
  if(endTop.value < paddedBottom1 || endTop.value > paddedBottom2) {
    const len = listLength.value;
    return Math.min(len, getRowIdx(bottomOffset + padding2) + 1);
  } else {
    return endIdx.value;
  }
}
/** calculate visible portion of list and update vlist */
const redraw = () => {
  // if(debug) console.log("Vue3Vscroll.redraw");
  // if(debug) console.time("Vue3Vscroll.redraw");
  update();
  const scrollTop = viewport.value.scrollTop;
  const viewportTop = viewport.value.getBoundingClientRect().y;
  const windowHeight = window.innerHeight;
  screenHeight.value = headerHeight.value + getTotalRowHeight() + footerHeight.value;
  viewportHeight2.value = viewportHeight.value == null ? screenHeight.value : viewportHeight.value;
  const padding2 = padding.value == null ? 
    Math.min(windowHeight, viewportHeight2.value) * defaultPaddingRatio : padding.value;

  const visibleViewportTop = Math.max(0, - viewportTop)
  const topOffset = scrollTop + visibleViewportTop - headerHeight.value;
  const newStartIdx = getStartIdx(topOffset, padding2);

  const visibleViewportHeight = Math.min(viewportHeight2.value, windowHeight - viewportTop);
  const bottomOffset = scrollTop + visibleViewportHeight - headerHeight.value;
  const newEndIdx = Math.max(newStartIdx, getEndIdx(bottomOffset, padding2));

  if(newStartIdx != startIdx.value || newEndIdx != endIdx.value) {
    startIdx.value = newStartIdx;
    endIdx.value = newEndIdx;
    startTop.value = getRowTop(newStartIdx);
    endTop.value = getRowTop(newEndIdx);
    vlist.value = list.value.slice(startIdx.value, endIdx.value);
    sheetStyle.value = { transform: `translateY(${startTop.value}px)`, willChange: 'transform' };
    nextTick(() => emit('updateHeight', newStartIdx, newEndIdx));
  }
  // if(debug) console.timeEnd("Vue3Vscroll.redraw");
}
/** debounced version of redraw */
const onRedraw = debounce(redraw, props.redrawWait);

watch(list, onRedraw);
watch(defaultHeight, onRedraw);
watch(headerHeight, onRedraw);
watch(footerHeight, onRedraw);
watch(viewportHeight, onRedraw);
watch(redrawSignal, onRedraw);
watch(padding, onRedraw);
watch(hysteresis, onRedraw);

if(props.addWindowEvent) {
  window.addEventListener('scroll', onRedraw);
  window.addEventListener('resize', onRedraw);
}
onMounted(onRedraw);

</script>
