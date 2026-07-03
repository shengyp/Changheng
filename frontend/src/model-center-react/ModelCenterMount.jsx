import React from 'react'
import { createRoot } from 'react-dom/client'
import ModelCenterPage from './pages/ModelCenterPage'
import './modelCenter.css'

class ModelCenterErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[model-center-react] render failed', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="model-center-fallback model-center-error">
          <h2>模型中心加载失败</h2>
          <p>{this.state.error?.message || 'React 模型中心组件渲染异常'}</p>
        </div>
      )
    }

    return this.props.children
  }
}

export function mountModelCenter(element) {
  const root = createRoot(element)
  root.render(
    <ModelCenterErrorBoundary>
      <ModelCenterPage />
    </ModelCenterErrorBoundary>,
  )
  return () => root.unmount()
}
