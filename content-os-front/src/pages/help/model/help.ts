import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { queryParam, useQueryParams } from '@/shared/lib'
import { helpTopics, searchTopics } from './topics'

// The search lives in the URL, so Back from an article returns to the same results.
export function useHelp() {
  const router = useRouter()
  const { state: query } = useQueryParams({ search: queryParam.text() })

  const topics = computed(() => searchTopics(helpTopics, query.search))

  // Help opens from the account menu on any screen: Back returns there, or
  // home when the page was opened directly.
  function back() {
    if (router.options.history.state.back) router.back()
    else void router.push({ name: 'home' })
  }

  return { query, topics, back }
}
