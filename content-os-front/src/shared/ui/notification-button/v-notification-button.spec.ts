import { mount } from '@vue/test-utils'
import VNotificationButton from './v-notification-button.vue'

describe('VNotificationButton', () => {
  it('shows the dot and says so only when something is unread', () => {
    const read = mount(VNotificationButton)
    expect(read.attributes('aria-label')).toBe('Notifications')
    expect(read.find('span').exists()).toBe(false)

    const unread = mount(VNotificationButton, { props: { unread: true } })
    expect(unread.attributes('aria-label')).toBe('Notifications, unread')
    expect(unread.find('span').exists()).toBe(true)
  })
})
