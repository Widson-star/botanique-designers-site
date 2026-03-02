import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Component crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white rounded-xl shadow-md text-center">
          <p className="text-botanique-green font-semibold">
            ⚠️ Something went wrong here.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Please refresh the page or try again later.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
