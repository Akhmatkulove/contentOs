import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { findArticle } from './topics'

export type ArticleVote = 'yes' | 'no'

export function useHelpArticle(slug: MaybeRefOrGetter<string>) {
  const topic = computed(() => findArticle(toValue(slug)))

  // "Was this article helpful?": the answer only thanks the user for now.
  // TODO(api): save article feedback.
  const vote = ref<ArticleVote | null>(null)
  watch(topic, () => (vote.value = null))

  return { topic, vote }
}
