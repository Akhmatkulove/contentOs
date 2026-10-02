import { mount } from '@vue/test-utils'
import VPagination from './v-pagination.vue'

function mountPagination(total: number, page = 1) {
  const wrapper = mount(VPagination, {
    props: {
      total,
      itemsPerPage: 8,
      page,
      'onUpdate:page': (value: number) => wrapper.setProps({ page: value }),
    },
  })
  return wrapper
}

const pageLabels = (wrapper: ReturnType<typeof mountPagination>) =>
  wrapper.findAll('[data-type="page"]').map((button) => button.text())

describe('VPagination', () => {
  it('shows one button per page and marks the current one', () => {
    const wrapper = mountPagination(32, 2)
    expect(pageLabels(wrapper)).toEqual(['1', '2', '3', '4'])
    expect(wrapper.find('[aria-current="page"]').text()).toBe('2')
  })

  it('collapses to a single page when there is nothing to page through', () => {
    const wrapper = mountPagination(0)
    expect(pageLabels(wrapper)).toEqual(['1'])
    expect(wrapper.get('[aria-label="Previous page"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()
  })

  it('moves to the clicked page and with the arrows', async () => {
    const wrapper = mountPagination(32)
    await wrapper.findAll('[data-type="page"]')[2]!.trigger('click')
    expect(wrapper.props('page')).toBe(3)

    await wrapper.get('[aria-label="Next page"]').trigger('click')
    expect(wrapper.props('page')).toBe(4)
  })

  it('shortens long ranges with an ellipsis', () => {
    const wrapper = mountPagination(200, 10)
    expect(pageLabels(wrapper)).toEqual(['1', '9', '10', '11', '25'])
    expect(wrapper.text()).toContain('…')
  })
})
