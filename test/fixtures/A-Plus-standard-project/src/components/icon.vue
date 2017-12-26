<template>
  <span
    :class="['icon', 'icon-' + name, type ? ('icon-' + type) : '', clazz]"
    v-html="html"/>
</template>

<script>
  // Load all icons
  require('~utils/load-icons')

  export default {
    props: [
      'name',
      'type',
      'clazz',
    ],

    computed: {
      html () {
        return `
          <svg>
            <use xlink:href="#icon-${this.name}"/>
          </svg>
        `
      },
    },
  }

  // In Chrome console，how to get none rectangle icon's real width
  // window.__getSVGIconsWidth = () => {
  //   return [].slice.call(document.querySelectorAll('symbol')).map((symbol) => {
  //     let rect = symbol.viewBox.animVal
  //     return rect.width === rect.height ? '' : `
  //       .${symbol.id} {
  //         width: ${rect.width}em / ${rect.height};
  //       }
  //     `
  //   }).join('')
  // }
</script>
