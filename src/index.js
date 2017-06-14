'use strict'
const queue = Symbol('actions')
const { Map } = require('immutable')

module.exports.call = (action, funk) => {
  action[queue] = (action[queue] || []).concat([funk])
}

// function from reducer to another reducer
// the new reducer adds a 'funks' key with declarative effects
// of type [func, [args]]
module.exports.coalesceFunks = reducer => (state, action) => {
  const nextState = reducer(state, action)
  const funks = action[queue] || []
  // restore action to the way it was
  delete action[queue]
  return Object.assign({}, nextState, {funks})
}

// function from reducer to another reducer
// the new reducer adds a 'funks' key with declarative effects
// of type [func, [args]]
// returns an Immutable object
module.exports.coalesceFunksImmutable = reducer => (state, action) => {
  const nextState = reducer(state, action)
  const funks = action[queue] || []
  // restore action to the way it was
  delete action[queue]
  const map = Map(nextState)
  return map.set('funks', funks)
}

// listen for store updates, and run each funk.
// `runFunks` assumes that each funk either returns nothing
// or returns a promise for an action.
// `runFunks` dispatches the actions
// You can replace `runFunks` with your own implementation
// if you prefer callbacks over promises, for example
module.exports.runFunks = store => {
  store.subscribe(() => {
    const funks = store.getState().funks || []
    funks.forEach(function(funk) {
      const func = funk[0]
      const args = funk[1]
      const maybePromiseForAction = func.apply(null, args)
      if (!maybePromiseForAction || !maybePromiseForAction.then) {
        return
      }
      maybePromiseForAction.then(store.dispatch)
    })
  })
}

// listen for store updates, and run each funk.
// `runFunksImmutable` assumes that each funk either returns nothing
// or returns a promise for an action.
// `runFunksImmutable` dispatches the actions
// You can replace `runFunksImmutable` with your own implementation
// if you prefer callbacks over promises, for example
module.exports.runFunksImmutable = store => {
  store.subscribe(() => {
    const funks = store.getState().get('funks') || []
    funks.forEach(function(funk) {
      const func = funk[0]
      const args = funk[1]
      const maybePromiseForAction = func.apply(null, args)
      if (!maybePromiseForAction || !maybePromiseForAction.then) {
        return
      }
      maybePromiseForAction.then(store.dispatch)
    })
  })
}
