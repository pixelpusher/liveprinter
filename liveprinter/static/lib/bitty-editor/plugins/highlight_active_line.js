const __plugin = {
  instances: [],
  
  // subscribe to new notification in order to 
  // get reference to new editors
  init() {
    bitty.subscribe( 'new', __plugin.start )
  },

  start( instance ) {
    const _bitty = instance
    const plugin = {
      el: instance.el,
      __active: null,
      __prev:   null,
    }

    _bitty.subscribe( 'keydown', e => __plugin.keydown( e, plugin ))
    _bitty.subscribe( 'click', e => __plugin.click( e, plugin ))
    _bitty.subscribe( 'paste', e => __plugin.paste( e, plugin ))

    plugin.bitty = _bitty
    plugin.__active = _bitty.el.firstChild
    plugin.__active.classList.add( 'bitty-active')

    __plugin.instances.push( plugin )
  },

  removeOthers( plugin, exempt=null ) {
    const remove = node => node.classList.remove('bitty-active')

    Array.from( plugin.bitty.el.querySelectorAll('.bitty-active') )
      .filter( n => n !== exempt )
      .forEach( remove )
  },

  setActive( plugin, delay=5 ) {
    setTimeout( ()=> {
      const prev = plugin.__active 
      const sel  = window.getSelection()
      let node = sel.focusNode
      if( node.localName !== 'div' ) node = node.parentElement

      console.log( node, prev )
      if( node !== prev && node !== plugin.bitty.el ) {
        plugin.__active = node
      }else if( node === plugin.bitty.el ) {
        plugin.__active = plugin.bitty.el.childNodes[ plugin.bitty.el.childNodes.length - 1 ]
      }

      __plugin.removeOthers( plugin, plugin.__active )

      plugin.__active.classList.add( 'bitty-active' )
    }, delay )

  },

  keydown( e, plugin ) {
    __plugin.setActive( plugin )
  },

  paste( e, plugin ) {
    __plugin.setActive( plugin, 20 )
  },

  click( e, plugin ) {
    __plugin.setActive( plugin )
  }
}

__plugin.init()
