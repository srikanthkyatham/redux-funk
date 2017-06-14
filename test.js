'use strict'
const { deepEqual } = require('assert')
const { createStore } = require('redux')
const { coalesceFunks, coalesceFunksImmutable, funkMiddleware, call, runFunks, runFunksImmutable } = require('./src/index.js')
const test = require('tape')
const { Map } = require('immutable')

const asyncAction = payload => new Promise((resolve, reject) => {
  resolve({type: 'SECOND', payload})
})

const reducer = coalesceFunks((state = {text: 'initial'}, action) => {
  switch (action.type) {
    case 'FIRST':
      call(action, [asyncAction, ['payload']])
      return Object.assign({}, state, {text: 'foo'})
    case 'SECOND':
      return Object.assign({}, {text: action.payload})
    default:
      return state
  }
})

const reducerImmutable = coalesceFunksImmutable((state = Map({text: 'initial'}), action) => {
  switch (action.type) {
    case 'FIRST': {
      call(action, [asyncAction, ['payload']])
      const map = Map(state)
      return map.set("text", 'foo')
    }
    case 'SECOND': {
      const map = Map(state)
      return map.set("text", action.payload)
    }
    default:
      return state
  }
})


test('integration: `call` and `coalesceFunks`', t => {
  const { dispatch, getState } = createStore(reducer)
  const action = {type: 'FIRST'}
  dispatch(action)
  t.deepEqual(
            getState().funks[0],
            [asyncAction, ['payload']],
            'funks are added to `state`')
  t.deepEqual(
            Object.getOwnPropertySymbols(action),
            [],
            'reducer is pure (action restored to the way it was)')
  t.deepEqual(
            getState().text,
            'foo',
            'rest of state is updated correctly')
  dispatch({type: 'SECOND', payload: 'new payload'})
  t.deepEqual(
            getState(),
            {funks: [], text: 'new payload'},
            'funks are reset on each action'
            )
  t.end()
})

test('integration: `call` and `coalesceFunks Immutable`', t => {

  const { dispatch, getState } = createStore(reducerImmutable, Map())
  const action = {type: 'FIRST'}
  dispatch(action)
  t.deepEqual(
            getState().get('funks')[0],
            [asyncAction, ['payload']],
            'funks are added to `state`')
  t.deepEqual(
            Object.getOwnPropertySymbols(action),
            [],
            'reducer is pure (action restored to the way it was)')
  t.deepEqual(
            getState().getIn(["text"]),
            'foo',
            'rest of state is updated correctly')
  dispatch({type: 'SECOND', payload: 'new payload'})
  t.deepEqual(
            getState().toJS(),
            {funks: [], text: 'new payload'},
            'funks are reset on each action'
            )
  t.end()
})

test('`runFunks`', t => {
  // BEGIN FIXTURES
  let calledWith
  const mock = arg => {
    calledWith = arg
    return Promise.resolve({type: 'BAR'})
  }
  const reducer = coalesceFunks((state={}, action) => {
    switch (action.type) {
      case 'FOO':
        call(action, [mock, [action.payload]])
        return state
      case 'BAR':
        return Object.assign(state, {'funksHaveRun': true})
    }
  })
  const store = createStore(reducer)
  const { dispatch, getState } = store
  runFunks(store)
  const action = {type: 'FOO', payload: 'hi'}
  dispatch(action)
  // END FIXTURES

  t.deepEqual(
    calledWith,
    action.payload,
    'calls funks'
  )

  // wait to next tick of event loop for promise to resolve
  setTimeout(() => {
    t.deepEqual(
      getState().funksHaveRun,
      true,
      'dispatches actions'
    )
    t.end()
  })
})

test('`runFunks Immutable`', t => {
  // BEGIN FIXTURES
  let calledWith
  const mock = arg => {
    calledWith = arg
    return Promise.resolve({type: 'BAR'})
  }
  const reducer = coalesceFunksImmutable((state=Map(), action) => {
    switch (action.type) {
      case 'FOO':
        call(action, [mock, [action.payload]])
        return state
      case 'BAR':
        const map = Map(state)
        return map.set('funksHaveRun', true)
    }
  })
  const store = createStore(reducer)
  const { dispatch, getState } = store
  runFunksImmutable(store)
  const action = {type: 'FOO', payload: 'hi'}
  dispatch(action)
  // END FIXTURES

  t.deepEqual(
    calledWith,
    action.payload,
    'calls funks'
  )

  // wait to next tick of event loop for promise to resolve
  setTimeout(() => {
    t.deepEqual(
      getState().get('funksHaveRun'),
      true,
      'dispatches actions'
    )
    t.end()
  })
})
