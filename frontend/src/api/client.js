import { request } from './http'

export function clean(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

function send(method, url, options = {}) {
  return request({
    url,
    method,
    ...options,
  })
}

export function get(url, params, options = {}) {
  return send('get', url, {
    ...(params === undefined ? {} : { params }),
    ...options,
  })
}

export function query(url, params, options = {}) {
  return get(url, clean(params), options)
}

export function post(url, data, options = {}) {
  return send('post', url, {
    ...(data === undefined ? {} : { data }),
    ...options,
  })
}

export function put(url, data, options = {}) {
  return send('put', url, {
    ...(data === undefined ? {} : { data }),
    ...options,
  })
}

export function patch(url, data, options = {}) {
  return send('patch', url, {
    ...(data === undefined ? {} : { data }),
    ...options,
  })
}

export function del(url, options = {}) {
  return send('delete', url, options)
}
