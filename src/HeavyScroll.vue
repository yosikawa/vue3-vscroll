<template>
  <h1>HeavyScroll</h1>
  <div>
    <ul v-for="item of list" :key="item.id">
      <li style="flex-basis: 50px; ">{{ item.id }}</li>
      <li style="flex-basis: 80px; "><input type="checkbox" v-model="item.check">{{ item.check ? "ON" : "OFF" }}</li>
      <li style="flex-basis: 80px; ">{{ item.text }}</li>
      <li style="flex-basis: 400px; ">{{ item.msg }}</li>
      <li style="flex-basis: 400px; "><textarea v-model="item.msg" rows="3" style="width: calc(100% - 10px); height: calc(100% - 10px);"></textarea></li>
    </ul>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  props: {
  },
  setup(props) {
    const itemCount = 10000;
    const list = ref([]);
    const rand = (max) => Math.floor(Math.random() * max);
    const words = ['hello', 'world', 'nice', 'fox', ];
    for(let id=0; id<itemCount; ++id) {
      const msg = Array(rand(100)+1).fill('').map(() => words[rand(words.length)]).join(' ') + '.';
      list.value.push({ id, check: false, text: `[item ${id}]`, msg });
    }
    return { list };
  }
}

</script>

<style>
ul {
  display: flex;
  margin: 0px;
  padding: 0px;
}
li {
  border: solid 1px black;
  padding: 2px;
  list-style-type: none;
  display: block;
  flex-basis: 200px;
  background: lightblue;
}
</style>
