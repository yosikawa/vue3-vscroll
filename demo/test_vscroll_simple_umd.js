const app = Vue.createApp({
    data() {
      return {
        list: [],
      }
    },
    mounted() {
      const rowCount = 10000;

      // make list
      const rand = (max) => Math.floor(Math.random() * max);
      const words = ['hello', 'world', 'nice', 'fox', ];
      for(let id=0; id<rowCount; ++id) {
        const msg = Array(rand(100)+1).fill('').map(() => words[rand(words.length)]).join(' ') + '.';
        this.list.push({ id, msg });
      }
    },
    mixins: [Vue3Vscroll],
})
app.mount('#app')
