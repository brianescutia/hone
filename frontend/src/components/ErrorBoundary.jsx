import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[60vh] grid place-items-center p-6">
                    <div className="card p-6 max-w-md text-center">
                        <h2 className="section-cap mb-2">Something went wrong</h2>
                        <p className="text-sm text-ink-700 mb-4">
                            We hit an unexpected error. Try reloading the page. If it keeps
                            happening, use the Report a problem link in the footer.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-primary"
                        >
                            Reload page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}