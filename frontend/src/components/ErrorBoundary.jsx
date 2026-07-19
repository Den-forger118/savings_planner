import { Component } from 'react';
import ServerErrorPage from './ServerErrorPage';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unexpected UI error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
      return;
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ServerErrorPage
          title="Something unexpected happened"
          message="We hit a snag displaying this screen. Your ledger is safe — a refresh usually clears it."
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
