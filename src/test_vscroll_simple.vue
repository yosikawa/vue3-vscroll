<!-- virtual scroll test using Vue3VscrollSimple -->

<template>
  <h3>test_vscroll_simple</h3>
  <vue3-vscroll-simple :list="list" :default-height="80">
    <template v-slot:header>
      <ul>
        <li class="narrow">#</li>
        <li class="narrow"><input type="checkbox" @click="list.forEach(row => row.flag = $event.target.checked)"></li>
        <li>vlist range</li>
        <li class="wide">message</li>
        <li class="wide">textarea</li>
      </ul>
    </template>
    <template v-slot="slot">
      <ul>
        <li class="narrow">{{ slot.row.id }}</li>
        <li class="narrow"><input type="checkbox" v-model="slot.row.flag">{{ slot.row.flag ? "ON" : "OFF" }}</li>
        <li>[{{ slot.vlist[0]?.id }} - {{ slot.vlist[slot.vlist.length-1]?.id }}]</li>
        <li class="wide">{{ slot.row.msg }}</li>
        <li class="wide"><textarea v-model="slot.row.msg" rows="3" style="width: calc(100% - 20px);"></textarea></li>
      </ul>
    </template>
    <template v-slot:footer>
      <ul>
        <li class="narrow">#</li>
        <li>vlist range</li>
        <li class="wide">message</li>
        <li class="wide">textarea</li>
      </ul>
    </template>
  </vue3-vscroll-simple>
</template>

<script setup>
import Vue3VscrollSimple from './Vue3VscrollSimple.vue'
import { ref } from 'vue'

const rowCount = 10000;
const list = ref([]);

// make list
const rand = (max) => Math.floor(Math.random() * max);
const words = ['hello', 'world', 'nice', 'fox', ];
for(let id=0; id<rowCount; ++id) {
  const msg = Array(rand(100)+1).fill('').map(() => words[rand(words.length)]).join(' ') + '.';
  list.value.push({ id, msg });
}

</script>
