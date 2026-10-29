import { Component } from 'react';

// Muestra el error de una sección sin romper toda la página
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Error al visualizar:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="alerta alerta-error">
          <strong>No se pudo mostrar esta sección.</strong>
          <div className="alerta-detalle">{this.state.error.message}</div>
          <button className="btn btn-sec" onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
