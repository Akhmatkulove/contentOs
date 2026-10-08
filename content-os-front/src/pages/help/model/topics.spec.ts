import { findArticle, helpTopics, searchTopics, type HelpTopic } from './topics'

const topics: HelpTopic[] = [
  { slug: 'a', title: 'How to complete a task', description: 'Submit your content' },
  { slug: 'b', title: 'File upload issues', description: 'Troubleshoot upload problems' },
]

describe('searchTopics', () => {
  it('returns every topic for an empty query', () => {
    expect(searchTopics(topics, '  ')).toEqual(topics)
  })

  it('matches the title or the description, ignoring case', () => {
    expect(searchTopics(topics, 'TASK').map((t) => t.slug)).toEqual(['a'])
    expect(searchTopics(topics, 'troubleshoot').map((t) => t.slug)).toEqual(['b'])
    expect(searchTopics(topics, 'upload').map((t) => t.slug)).toEqual(['b'])
  })

  it('returns nothing when nothing matches', () => {
    expect(searchTopics(topics, 'payments')).toEqual([])
  })
})

describe('findArticle', () => {
  it('finds a topic that has an article', () => {
    expect(findArticle('complete-a-task')?.title).toBe('How to complete a task')
  })

  it('returns null for a topic without an article or an unknown slug', () => {
    expect(findArticle('general-questions')).toBeNull()
    expect(findArticle('nope')).toBeNull()
  })

  it('keeps slugs unique', () => {
    const slugs = helpTopics.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
