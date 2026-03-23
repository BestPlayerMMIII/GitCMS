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

## Rich Text LaTeX

If your post body contains GitCMS rich text (`<gitcms-math>` and
`<gitcms-toolcall>`), keep rendering with `v-html`, but preprocess once before
display.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { resolveToolcalls } from '@git-cms/client';

const enhancedContent = ref<string>('');
const contentLoading = ref(false);

const enhanceContentMedia = async (schemaId: string, postId: string) => {
  contentLoading.value = true;
  try {
    const fullPost = await apiService.getPostByIdFull(schemaId, postId);

    if (fullPost?.data?.content) {
      // LaTeX is resolved automatically by resolveToolcalls.
      enhancedContent.value = resolveToolcalls(fullPost.data.content, {});
    }
  } catch (e) {
    console.error('Failed to enhance content media:', e);
    enhancedContent.value = resolveToolcalls(props.post.data.content || '', {});
  } finally {
    contentLoading.value = false;
  }
};

enhancedContent.value = resolveToolcalls(props.post.data.content || '', {});
</script>

<template>
  <article v-html="enhancedContent" />
</template>
```

### Optional: KaTeX CSS for richer math typography

Math is visible by default via MathML. If you prefer KaTeX visual style:

```ts
import { resolveMath } from '@git-cms/client';
import 'katex/dist/katex.min.css';

const html = resolveMath(rawContent, { output: 'htmlAndMathml' });
```
