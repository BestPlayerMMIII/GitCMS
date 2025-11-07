# Vue.js Integration

Use GitCMS with Vue.js applications.

## Composition API

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/blog' });
const posts = ref([]);

onMounted(async () => {
  posts.value = await cms
    .from('posts')
    .where('metadata.status', '==', 'published')
    .get();
});
</script>

<template>
  <div>
    <article v-for="post in posts" :key="post.id">
      <h2>{{ post.data.title }}</h2>
    </article>
  </div>
</template>
```

## Options API

```vue
<script>
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/blog' });

export default {
  data() {
    return {
      posts: [],
    };
  },
  async mounted() {
    this.posts = await cms.from('posts').get();
  },
};
</script>
```
