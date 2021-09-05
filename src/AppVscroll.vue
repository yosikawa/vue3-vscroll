<template>
  [<a href="/index.html">index</a>]
  <hr>
  [<a href="#" @click="comp='HeavyScroll'">HeavyScroll</a>]
  [<a href="#" @click="comp='VScroll10'">VScroll10</a>]
  [<a href="#" @click="comp='VScrollS1'">VScrollS1</a>]

  <component :is="comp"></component>

</template>

<script>
import { ref } from 'vue'
import VScrollS1 from './test_vscroll_simple.vue'

export default {
  props: {
  },
  components: {
    VScrollS1,
  },
  setup(props) {
    const comp = ref('VScrollS1');
    return { comp };
  }
}

</script>

<style>
</style>
