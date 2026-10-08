// Help content lives in the front end until there is a place to edit it.
// Figma has the text of one article only; the other topics show in the list
// but don't open.
// TODO(api): help articles — the rest of the texts, and editing them.

export interface HelpTopic {
  slug: string
  title: string
  description: string
  article?: {
    // Figma: "Updated Sep 12, 2024 · 2 min read".
    updated: string
    readMinutes: number
    steps: { title: string; text: string }[]
  }
}

export const helpTopics: HelpTopic[] = [
  {
    slug: 'complete-a-task',
    title: 'How to complete a task',
    description: 'Learn how to submit your content and get feedback',
    article: {
      updated: 'Sep 12, 2024',
      readMinutes: 2,
      steps: [
        {
          title: 'Open your task',
          text: 'Go to My tasks and click on the task you want to work on. You’ll see the task details, product information, references, and the list of deliverables.',
        },
        {
          title: 'Review the brief',
          text: 'Read the brief carefully. Check the reference materials, shot types, and any specific notes from the team.',
        },
        {
          title: 'Create and upload your content',
          text: 'Once you’ve created your content, click the Upload button and add your files. You can upload multiple photos or videos at once.',
        },
        {
          title: 'Submit for review',
          text: 'After uploading, click Submit. Our team will review your content and leave feedback directly in the task.',
        },
        {
          title: 'Track the status',
          text: 'You can always check the status in your task list. We’ll notify you once your content is approved or if changes are needed.',
        },
      ],
    },
  },
  {
    slug: 'shooting-guidelines',
    title: 'Shooting guidelines',
    description: 'Tips for creating high-quality content',
  },
  {
    slug: 'file-upload-issues',
    title: 'File upload issues',
    description: 'Troubleshoot common upload problems',
  },
  {
    slug: 'task-statuses',
    title: 'Task statuses explained',
    description: 'Understand what each status means',
  },
  {
    slug: 'payments-and-rewards',
    title: 'Payments and rewards',
    description: 'Learn about our payment process',
  },
  {
    slug: 'general-questions',
    title: 'General questions',
    description: 'Other helpful information',
  },
]

// Case-insensitive match on the title or the description.
export function searchTopics(topics: HelpTopic[], query: string): HelpTopic[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return topics
  return topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(needle) ||
      topic.description.toLowerCase().includes(needle),
  )
}

export function findArticle(slug: string) {
  const topic = helpTopics.find((t) => t.slug === slug)
  return topic?.article ? { ...topic, article: topic.article } : null
}
